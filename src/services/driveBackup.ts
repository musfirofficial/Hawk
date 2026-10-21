import * as FileSystem from "expo-file-system/legacy";
import { eq } from "drizzle-orm";
import { db, expoDb } from "../db";
import * as schema from "../db/schema";
import { getGoogleAccessToken } from "./googleAuth";

export interface DriveBackupMetadata {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "Never";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Never";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Never";
  }
}

/**
 * Get local database file size in bytes.
 */
export async function getLocalDatabaseSize(): Promise<number> {
  try {
    const rawPath =
      expoDb.databasePath || `${FileSystem.documentDirectory}SQLite/hawk.db`;
    const uri = rawPath.startsWith("file://") ? rawPath : `file://${rawPath}`;
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? (info as any).size || 0 : 0;
  } catch (err) {
    console.warn("Failed to get local database size:", err);
    return 0;
  }
}

/**
 * Fetch existing Hawk backup file metadata from Google Drive appDataFolder.
 * Automatically attempts token refresh and retries once if a 401 is encountered.
 */
export async function fetchCloudBackupMetadata(
  accessToken: string
): Promise<DriveBackupMetadata | null> {
  const url =
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='hawk_backup.db' and trashed=false&fields=files(id,name,size,modifiedTime)";

  try {
    let token = accessToken;
    let res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      console.warn("Google Drive returned 401 on metadata fetch. Attempting token refresh...");
      const freshToken = await getGoogleAccessToken(true);
      if (freshToken) {
        token = freshToken;
        res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }

    if (!res.ok) {
      console.warn("Google Drive list files response error:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        id: file.id,
        name: file.name,
        size: parseInt(file.size || "0", 10),
        modifiedTime: file.modifiedTime,
      };
    }
    return null;
  } catch (err) {
    console.warn("Failed to query Google Drive backup metadata:", err);
    return null;
  }
}

/**
 * Create a clean SQLite snapshot and upload it to Google Drive appDataFolder.
 * Automatically refreshes token on 401.
 */
export async function performBackupToDrive(
  accessToken: string
): Promise<DriveBackupMetadata> {
  const snapshotUri = `${FileSystem.cacheDirectory}hawk_snapshot.db`;
  const snapshotPosixPath = snapshotUri.replace(/^file:\/\//, "");
  let token = accessToken;

  try {
    // 1. Create a clean vacuumed snapshot
    await FileSystem.deleteAsync(snapshotUri, { idempotent: true });
    expoDb.execSync(`VACUUM INTO '${snapshotPosixPath}'`);

    // 2. Check if a backup file already exists on Drive
    let fileId: string | null = null;
    const existing = await fetchCloudBackupMetadata(token);

    if (existing) {
      fileId = existing.id;
    } else {
      // Create new file metadata entry in appDataFolder
      let createRes = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "hawk_backup.db",
            parents: ["appDataFolder"],
          }),
        }
      );

      if (createRes.status === 401) {
        console.warn("Google Drive returned 401 on file init. Attempting token refresh...");
        const freshToken = await getGoogleAccessToken(true);
        if (freshToken) {
          token = freshToken;
          createRes = await fetch(
            "https://www.googleapis.com/drive/v3/files",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: "hawk_backup.db",
                parents: ["appDataFolder"],
              }),
            }
          );
        }
      }

      if (!createRes.ok) {
        throw new Error(
          `Failed to initialize backup on Google Drive (${createRes.status})`
        );
      }
      const createData = await createRes.json();
      fileId = createData.id;
    }

    if (!fileId) {
      throw new Error("Could not obtain file ID from Google Drive");
    }

    // 3. Upload database file contents
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    let uploadResult = await FileSystem.uploadAsync(uploadUrl, snapshotUri, {
      httpMethod: "PATCH",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-sqlite3",
      },
    });

    if (uploadResult.status === 401) {
      console.warn("Google Drive returned 401 on upload. Attempting token refresh...");
      const freshToken = await getGoogleAccessToken(true);
      if (freshToken) {
        token = freshToken;
        uploadResult = await FileSystem.uploadAsync(uploadUrl, snapshotUri, {
          httpMethod: "PATCH",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-sqlite3",
          },
        });
      }
    }

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(
        `Failed to upload backup to Google Drive (Status ${uploadResult.status})`
      );
    }

    // 4. Update last_backup timestamp in app_settings
    const now = new Date().toISOString();
    db.update(schema.appSettings)
      .set({
        lastBackup: now,
        updatedAt: now,
      })
      .where(eq(schema.appSettings.id, 1))
      .run();

    // 5. Fetch updated metadata to return
    const updatedMeta = await fetchCloudBackupMetadata(token);
    return (
      updatedMeta || {
        id: fileId,
        name: "hawk_backup.db",
        size: await getLocalDatabaseSize(),
        modifiedTime: now,
      }
    );
  } finally {
    await FileSystem.deleteAsync(snapshotUri, { idempotent: true });
  }
}

/**
 * Download backup from Google Drive and atomically restore tables into local database.
 * Automatically refreshes token on 401.
 */
export async function performRestoreFromDrive(
  accessToken: string,
  fileId: string
): Promise<void> {
  const tempUri = `${FileSystem.cacheDirectory}hawk_restore_temp.db`;
  const tempPosixPath = tempUri.replace(/^file:\/\//, "");
  let token = accessToken;

  try {
    await FileSystem.deleteAsync(tempUri, { idempotent: true });

    // 1. Download file from Google Drive
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    let downloadResult = await FileSystem.downloadAsync(
      downloadUrl,
      tempUri,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (downloadResult.status === 401) {
      console.warn("Google Drive returned 401 on download. Attempting token refresh...");
      const freshToken = await getGoogleAccessToken(true);
      if (freshToken) {
        token = freshToken;
        downloadResult = await FileSystem.downloadAsync(
          downloadUrl,
          tempUri,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    }

    if (downloadResult.status < 200 || downloadResult.status >= 300) {
      throw new Error(
        `Failed to download cloud backup (Status ${downloadResult.status})`
      );
    }

    const downloadInfo = await FileSystem.getInfoAsync(tempUri);
    if (!downloadInfo.exists || ((downloadInfo as any).size || 0) <= 0) {
      throw new Error("Downloaded backup file is empty or corrupted.");
    }

    // 2. Attach downloaded database and copy data inside a safe transaction
    expoDb.execSync(`
      ATTACH DATABASE '${tempPosixPath}' AS backup_db;
      PRAGMA foreign_keys = OFF;
    `);

    try {
      // Find all user tables in the backup database
      const tables = expoDb.getAllSync<{ name: string }>(`
        SELECT name FROM backup_db.sqlite_master 
        WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE '__drizzle_%';
      `);

      expoDb.execSync("BEGIN IMMEDIATE TRANSACTION;");
      try {
        for (const tbl of tables) {
          const safeName = `"${tbl.name.replace(/"/g, '""')}"`;
          expoDb.execSync(`
            DELETE FROM main.${safeName};
            INSERT INTO main.${safeName} SELECT * FROM backup_db.${safeName};
          `);
        }
        expoDb.execSync("COMMIT;");
      } catch (txErr) {
        expoDb.execSync("ROLLBACK;");
        throw txErr;
      }
    } finally {
      try {
        expoDb.execSync(`
          PRAGMA foreign_keys = ON;
          DETACH DATABASE backup_db;
        `);
      } catch (detachErr) {
        console.warn("Error detaching backup_db:", detachErr);
      }
    }
  } finally {
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
  }
}

/**
 * Delete backup file from Google Drive appDataFolder.
 * Automatically refreshes token on 401.
 */
export async function deleteCloudBackup(
  accessToken: string,
  fileId: string
): Promise<void> {
  let token = accessToken;
  let res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401) {
    console.warn("Google Drive returned 401 on delete. Attempting token refresh...");
    const freshToken = await getGoogleAccessToken(true);
    if (freshToken) {
      token = freshToken;
      res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }
  }

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete cloud backup (Status ${res.status})`);
  }
}

