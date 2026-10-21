import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import {
  deleteCloudBackup,
  DriveBackupMetadata,
  fetchCloudBackupMetadata,
  formatBytes,
  formatDateTime,
  getLocalDatabaseSize,
  performBackupToDrive,
  performRestoreFromDrive,
} from "../../services/driveBackup";
import { getGoogleAccessToken } from "../../services/googleAuth";

export default function BackupRestoreScreen() {
  const router = useRouter();
  const { settings, connectGoogle, reloadSettings } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  const [localDbSize, setLocalDbSize] = useState<number>(0);
  const [cloudBackup, setCloudBackup] = useState<DriveBackupMetadata | null>(
    null
  );
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>("");

  // Prevent hardware back navigation while a backup or restore is running
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return isProcessing;
      }
    );
    return () => subscription.remove();
  }, [isProcessing]);

  // Load local and cloud backup metadata
  const refreshMetadata = useCallback(async () => {
    try {
      setIsLoadingMetadata(true);
      const size = await getLocalDatabaseSize();
      setLocalDbSize(size);

      if (settings?.googleEmail) {
        const token = await getGoogleAccessToken();
        const cloudMeta = token
          ? await fetchCloudBackupMetadata(token)
          : null;
        setCloudBackup(cloudMeta);
      } else {
        setCloudBackup(null);
      }
    } catch (err) {
      console.warn("Failed to load backup metadata:", err);
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [settings?.googleEmail]);

  useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata]);

  // Handle Backup
  async function handleBackup() {
    if (isProcessing) return;

    if (!settings?.googleEmail) {
      showConfirm({
        title: "Connect Google",
        message:
          "Connect your Google account to back up your database to Google Drive.",
        confirmText: "Connect",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const user = await connectGoogle();
            if (user) {
              await refreshMetadata();
            }
          } catch (err: any) {
            showAlert({
              title: "Connection Failed",
              message: err?.message || "Could not connect Google account.",
              type: "danger",
            });
          }
        },
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStatus("Backing up database...");

      const token = await getGoogleAccessToken();
      if (!token) {
        throw new Error(
          "Could not obtain Google authorization token. Please reconnect your Google account in Settings."
        );
      }

      const newMeta = await performBackupToDrive(token);
      setCloudBackup(newMeta);
      const size = await getLocalDatabaseSize();
      setLocalDbSize(size);
      reloadSettings();

      showAlert({
        title: "Backup Complete",
        message: "Your database was successfully backed up to Google Drive.",
        type: "success",
      });
    } catch (err: any) {
      console.error("Backup failed:", err);
      showAlert({
        title: "Backup Failed",
        message: err?.message || "Could not complete backup.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
      setProcessStatus("");
    }
  }

  // Handle Restore
  function handleRestorePrompt() {
    if (!cloudBackup || isProcessing) return;

    const backupDate = formatDateTime(cloudBackup.modifiedTime);

    showConfirm({
      title: "Restore Database",
      message: `Restoring will replace all current data with the cloud backup from ${backupDate}. This cannot be undone.`,
      confirmText: "Restore",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          setProcessStatus("Restoring database...");

          const token = await getGoogleAccessToken();
          if (!token) {
            throw new Error(
              "Could not obtain Google authorization token. Please reconnect your Google account in Settings."
            );
          }

          await performRestoreFromDrive(token, cloudBackup.id);
          const size = await getLocalDatabaseSize();
          setLocalDbSize(size);

          showAlert({
            title: "Restore Complete",
            message: "Your data has been successfully restored.",
            type: "success",
            onDismiss: () => {
              router.replace("/(tabs)");
            },
          });
        } catch (err: any) {
          console.error("Restore failed:", err);
          showAlert({
            title: "Restore Failed",
            message: err?.message || "Could not restore database.",
            type: "danger",
          });
        } finally {
          setIsProcessing(false);
          setProcessStatus("");
        }
      },
    });
  }

  // Handle Delete Cloud Backup
  function handleDeleteCloudBackup() {
    if (!cloudBackup || isProcessing) return;

    showConfirm({
      title: "Delete Cloud Backup",
      message:
        "Are you sure you want to permanently delete your cloud backup from Google Drive?",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          setProcessStatus("Deleting cloud backup...");

          const token = await getGoogleAccessToken();
          if (!token) {
            throw new Error("Could not obtain Google authorization token.");
          }

          await deleteCloudBackup(token, cloudBackup.id);
          setCloudBackup(null);

          showAlert({
            title: "Backup Deleted",
            message: "Cloud backup was removed from Google Drive.",
            type: "info",
          });
        } catch (err: any) {
          console.error("Delete backup failed:", err);
          showAlert({
            title: "Error",
            message: err?.message || "Could not delete cloud backup.",
            type: "danger",
          });
        } finally {
          setIsProcessing(false);
          setProcessStatus("");
        }
      },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <ScreenHeader
        title="Backup & Restore"
        onBack={() => {
          if (!isProcessing) router.back();
        }}
      />

      <View className="flex-1">
        {/* Top 50%: Backup Section */}
        <View className="flex-1 px-6 justify-between py-6">
          <View>
            <Text className="text-dark-text text-xl font-bold font-sans mb-4">
              Backup
            </Text>

            <View className="flex-row items-center justify-between py-3 border-b border-dark-border/40">
              <Text className="text-dark-muted text-sm font-sans">
                Google Account
              </Text>
              {settings?.googleEmail ? (
                <Text className="text-dark-text text-sm font-semibold font-sans">
                  {settings.googleEmail}
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const user = await connectGoogle();
                      if (user) await refreshMetadata();
                    } catch (err: any) {
                      showAlert({
                        title: "Connection Failed",
                        message: err?.message || "Could not connect Google account.",
                        type: "danger",
                      });
                    }
                  }}
                  className="px-3 py-1 rounded-full bg-brand-accent/15 border border-brand-accent/40"
                  activeOpacity={0.7}
                >
                  <Text className="text-brand-accent text-xs font-bold font-sans">
                    Connect
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-dark-border/40">
              <Text className="text-dark-muted text-sm font-sans">
                Last Backup
              </Text>
              <Text className="text-dark-text text-sm font-semibold font-sans">
                {formatDateTime(settings?.lastBackup)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-dark-border/40">
              <Text className="text-dark-muted text-sm font-sans">
                Database Size
              </Text>
              <Text className="text-dark-text text-sm font-semibold font-sans">
                {isLoadingMetadata ? "..." : formatBytes(localDbSize)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleBackup}
            disabled={isProcessing}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-2xl bg-brand-accent items-center justify-center active:opacity-90"
          >
            {isProcessing && processStatus.includes("Backing") ? (
              <ActivityIndicator size="small" color="#0B0D12" />
            ) : (
              <Text className="text-dark-bg text-base font-bold font-sans">
                Back Up Now
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="h-[1px] bg-dark-border/40 mx-6" />

        {/* Bottom 50%: Restore Section */}
        <View className="flex-1 px-6 justify-between py-6">
          <View>
            <Text className="text-dark-text text-xl font-bold font-sans mb-4">
              Restore
            </Text>

            <View className="flex-row items-center justify-between py-3 border-b border-dark-border/40">
              <Text className="text-dark-muted text-sm font-sans">
                Cloud Backup
              </Text>
              <Text className="text-dark-text text-sm font-semibold font-sans">
                {isLoadingMetadata
                  ? "Checking..."
                  : !settings?.googleEmail
                  ? "Not connected"
                  : cloudBackup
                  ? formatDateTime(cloudBackup.modifiedTime)
                  : "No backup found"}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-dark-border/40">
              <Text className="text-dark-muted text-sm font-sans">
                Backup Size
              </Text>
              <Text className="text-dark-text text-sm font-semibold font-sans">
                {isLoadingMetadata
                  ? "..."
                  : cloudBackup
                  ? formatBytes(cloudBackup.size)
                  : "—"}
              </Text>
            </View>
          </View>

          <View>
            <TouchableOpacity
              onPress={
                settings?.googleEmail
                  ? handleRestorePrompt
                  : async () => {
                      try {
                        const user = await connectGoogle();
                        if (user) await refreshMetadata();
                      } catch (err: any) {
                        showAlert({
                          title: "Connection Failed",
                          message: err?.message || "Could not connect Google account.",
                          type: "danger",
                        });
                      }
                    }
              }
              disabled={
                isProcessing ||
                isLoadingMetadata ||
                (Boolean(settings?.googleEmail) && !cloudBackup)
              }
              activeOpacity={0.8}
              className={`w-full py-3.5 rounded-2xl items-center justify-center ${
                !settings?.googleEmail || (cloudBackup && !isProcessing && !isLoadingMetadata)
                  ? "bg-dark-surface border border-dark-border active:bg-dark-card"
                  : "bg-dark-surface/40 border border-dark-border/30 opacity-50"
              }`}
            >
              {isProcessing && processStatus.includes("Restoring") ? (
                <ActivityIndicator size="small" color="#F8FAFC" />
              ) : (
                <Text
                  className={`text-base font-bold font-sans ${
                    !settings?.googleEmail || (cloudBackup && !isProcessing && !isLoadingMetadata)
                      ? "text-dark-text"
                      : "text-dark-muted"
                  }`}
                >
                  {!settings?.googleEmail ? "Connect to Restore" : "Restore Database"}
                </Text>
              )}
            </TouchableOpacity>

            {cloudBackup && !isProcessing ? (
              <TouchableOpacity
                onPress={handleDeleteCloudBackup}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                className="mt-3.5 items-center justify-center"
              >
                <Text className="text-rose-400 text-xs font-semibold font-sans">
                  Delete Cloud Backup
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Non-dismissable loading blocker when processing */}
      {isProcessing ? (
        <View className="absolute inset-0 bg-black/75 items-center justify-center z-50 px-6">
          <View className="p-6 rounded-3xl bg-dark-surface border border-dark-border items-center justify-center min-w-[200px]">
            <ActivityIndicator size="large" color="#D4F938" />
            <Text className="text-dark-text font-bold text-sm font-sans mt-4 text-center">
              {processStatus}
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
