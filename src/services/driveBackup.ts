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

// Bug fix #12: guard against NaN / negative inputs from parseInt on malformed size strings
export function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0 B";
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
 * Bug fix #9: Wrap fetch with a 30-second timeout via AbortController.
 * Throws on timeout so callers surface it as a real error instead of hanging.
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms = 30_000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

/**
 * Internal metadata fetcher that:
 *  - Throws on network/API errors (differentiates failure from "no file found") [Bug fix #2]
 *  - Returns the potentially-refreshed token alongside the metadata [Bug fix #4]
 *  - Cleans up duplicate backup files if > 1 found [Bug fix #1]
 */
async function fetchCloudBackupMetadataInternal(
  accessToken: string
): Promise<{ metadata: DriveBackupMetadata | null; token: string }> {
  // orderBy=createdTime desc ensures we keep the newest file if duplicates exist
  const url =
    "https://www.googleapis.com/drive/v3/files" +
    "?spaces=appDataFolder" +
    "&q=name='hawk_backup.db' and trashed=false" +
    "&fields=files(id,name,size,modifiedTime)" +
    "&orderBy=createdTime desc";

  let token = accessToken;
  let res = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    console.warn(
      "Google Drive returned 401 on metadata fetch. Attempting token refresh..."
    );
    const freshToken = await getGoogleAccessToken(true);
    if (freshToken) {
      token = freshToken;
      res = await fetchWithTimeout(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  // Bug fix #2: throw on API errors — do NOT silently return null
  if (!res.ok) {
    throw new Error(`Google Drive list files failed (${res.status})`);
  }

  const data = await res.json();

  if (!data.files || data.files.length === 0) {
    return { metadata: null, token };
  }

  // Bug fix #1: if duplicates accumulated (e.g. from prior bugs / Drive UI deletions), clean up extras
  if (data.files.length > 1) {
    console.warn(
      `Found ${data.files.length} backup files on Drive. Cleaning up ${data.files.length - 1} extra(s).`
    );
    for (let i = 1; i < data.files.length; i++) {
      try {
        await fetchWithTimeout(
          `https://www.googleapis.com/drive/v3/files/${data.files[i].id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (e) {
        console.warn("Failed to delete duplicate backup file:", e);
      }
    }
  }

  const file = data.files[0];
  return {
    metadata: {
      id: file.id,
      name: file.name,
      size: parseInt(file.size || "0", 10),
      modifiedTime: file.modifiedTime,
    },
    token,
  };
}

/**
 * Fetch existing Hawk backup file metadata from Google Drive appDataFolder.
 * Public API — returns null on "no file found" OR on errors (for UI backward-compat).
 * Prefer fetchCloudBackupMetadataInternal internally where error distinction matters.
 */
export async function fetchCloudBackupMetadata(
  accessToken: string
): Promise<DriveBackupMetadata | null> {
  try {
    const { metadata } = await fetchCloudBackupMetadataInternal(accessToken);
    return metadata;
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
    // 1. Bug fix #3: Flush any in-flight write transactions before snapshotting.
    //    BEGIN IMMEDIATE acquires a write lock; COMMIT releases it with all WAL pages flushed.
    //    VACUUM INTO then captures a clean, consistent state.
    await FileSystem.deleteAsync(snapshotUri, { idempotent: true });
    expoDb.execSync("BEGIN IMMEDIATE");
    expoDb.execSync("COMMIT");
    expoDb.execSync(`VACUUM INTO '${snapshotPosixPath}'`);

    // 2. Check if a backup file already exists on Drive.
    //    Bug fix #4: use fetchCloudBackupMetadataInternal so we get the refreshed token back.
    let fileId: string | null = null;
    let existing: DriveBackupMetadata | null = null;

    try {
      const result = await fetchCloudBackupMetadataInternal(token);
      existing = result.metadata;
      token = result.token; // use the potentially-refreshed token for all subsequent requests
    } catch (listErr) {
      // Bug fix #2: a real network error during list — do not silently create a duplicate.
      throw new Error(
        `Could not check for existing Drive backup: ${(listErr as Error).message}`
      );
    }

    if (existing) {
      fileId = existing.id;
    } else {
      // No existing file — create a new metadata entry in appDataFolder
      let createRes = await fetchWithTimeout(
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
        console.warn(
          "Google Drive returned 401 on file init. Attempting token refresh..."
        );
        const freshToken = await getGoogleAccessToken(true);
        if (freshToken) {
          token = freshToken;
          createRes = await fetchWithTimeout(
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
      console.warn(
        "Google Drive returned 401 on upload. Attempting token refresh..."
      );
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
    let downloadResult = await FileSystem.downloadAsync(downloadUrl, tempUri, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (downloadResult.status === 401) {
      console.warn(
        "Google Drive returned 401 on download. Attempting token refresh..."
      );
      const freshToken = await getGoogleAccessToken(true);
      if (freshToken) {
        token = freshToken;
        downloadResult = await FileSystem.downloadAsync(downloadUrl, tempUri, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

    // 2. Bug fix #7: Run each SQLite statement separately — multi-statement execSync
    //    is unreliable in expo-sqlite and can silently drop subsequent statements.
    expoDb.execSync(`ATTACH DATABASE '${tempPosixPath}' AS backup_db`);
    expoDb.execSync("PRAGMA foreign_keys = OFF");

    try {
      // Find all user tables in the backup database
      const tables = expoDb.getAllSync<{ name: string }>(`
        SELECT name FROM backup_db.sqlite_master 
        WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE '__drizzle_%';
      `);

      expoDb.execSync("BEGIN IMMEDIATE TRANSACTION");
      try {
        for (const tbl of tables) {
          const safeName = `"${tbl.name.replace(/"/g, '""')}"`;
          expoDb.execSync(`DELETE FROM main.${safeName}`);
          expoDb.execSync(
            `INSERT INTO main.${safeName} SELECT * FROM backup_db.${safeName}`
          );
        }

        // Bug fix #6: profile_pic stores a device-local path that is meaningless after
        // restore (different install / device). Reset it to avoid a permanently broken avatar.
        expoDb.execSync(
          `UPDATE main."app_settings" SET profile_pic = NULL WHERE profile_pic IS NOT NULL`
        );

        expoDb.execSync("COMMIT");
      } catch (txErr) {
        try {
          expoDb.execSync("ROLLBACK");
        } catch (rollbackErr) {
          console.warn("Rollback failed:", rollbackErr);
        }
        throw txErr;
      }
    } finally {
      // Bug fix #7 (continued): separate PRAGMA and DETACH statements
      try {
        expoDb.execSync("PRAGMA foreign_keys = ON");
        expoDb.execSync("DETACH DATABASE backup_db");
      } catch (detachErr) {
        console.warn("Error during restore cleanup:", detachErr);
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
  // Bug fix #10: wrap entire function in try/catch — prior version let network
  // errors (TypeError: Network request failed) propagate as unhandled exceptions.
  try {
    let token = accessToken;
    let res = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.status === 401) {
      console.warn(
        "Google Drive returned 401 on delete. Attempting token refresh..."
      );
      const freshToken = await getGoogleAccessToken(true);
      if (freshToken) {
        token = freshToken;
        res = await fetchWithTimeout(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    }

    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to delete cloud backup (Status ${res.status})`);
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      throw new Error(
        "Delete request timed out. Please check your connection and try again."
      );
    }
    throw err;
  }
}
