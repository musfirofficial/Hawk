import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { NumberFormatId } from "../../db/schema";
import {
  authenticateWithBiometrics,
  BiometricCapability,
  getBiometricCapability,
} from "../../services/biometrics";

export default function SetupPinScreen() {
  const router = useRouter();
  const { settings, completeOnboarding, updateSecuritySettings } = useAuth();
  const params = useLocalSearchParams<{
    userName?: string;
    currency?: string;
    numberFormat?: NumberFormatId;
    profilePic?: string;
    fromSettings?: string;
  }>();

  const isFromSettings = params.fromSettings === "true";

  // Step 1: "CREATE" (enter initial 4 digits)
  // Step 2: "CONFIRM" (re-enter 4 digits)
  const [step, setStep] = useState<"CREATE" | "CONFIRM">("CREATE");
  const [createdPin, setCreatedPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Biometrics prompt modal state
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [bioCapability, setBioCapability] = useState<BiometricCapability>({
    isAvailable: false,
    type: null,
    label: "None",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkBio() {
      const cap = await getBiometricCapability();
      setBioCapability(cap);
    }
    checkBio();
  }, []);

  function handleKeyPress(num: string) {
    if (currentPin.length >= 4) return;
    setErrorMsg(null);

    const next = currentPin + num;
    setCurrentPin(next);

    if (next.length === 4) {
      if (step === "CREATE") {
        // Save first entered PIN and prompt for confirmation
        setTimeout(() => {
          setCreatedPin(next);
          setCurrentPin("");
          setStep("CONFIRM");
        }, 200);
      } else {
        // Step === "CONFIRM"
        if (next === createdPin) {
          // PIN match!
          if (bioCapability.isAvailable) {
            setBioModalVisible(true);
          } else {
            finalizePinSetup(next, false);
          }
        } else {
          // Mismatch
          if (Platform.OS !== "web") {
            Vibration.vibrate(150);
          }
          setErrorMsg("PINs do not match. Please start again.");
          setTimeout(() => {
            setCreatedPin("");
            setCurrentPin("");
            setStep("CREATE");
          }, 400);
        }
      }
    }
  }

  function handleDeletePress() {
    setErrorMsg(null);
    if (currentPin.length > 0) {
      setCurrentPin((prev) => prev.slice(0, -1));
    }
  }

  async function finalizePinSetup(
    pinToSave: string,
    enableBiometrics: boolean,
  ) {
    try {
      setSaving(true);
      setErrorMsg(null);

      if (isFromSettings) {
        await updateSecuritySettings({
          pin: pinToSave,
          biometricsEnabled: enableBiometrics,
        });
        router.back();
      } else {
        // During Onboarding
        const userName = params.userName || settings?.userName || "Hawk User";
        const currency = params.currency || settings?.currency || "USD";
        const numberFormat = (params.numberFormat ||
          settings?.numberFormat ||
          "COMMA_DOT") as NumberFormatId;
        const profilePic = params.profilePic || settings?.profilePic || null;

        await completeOnboarding({
          userName,
          currency,
          numberFormat,
          profilePic,
          pin: pinToSave,
          biometricsEnabled: enableBiometrics,
        });

        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Failed to save PIN setup:", err);
      setErrorMsg("Failed to save security settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Handle Enable Biometrics button in prompt modal
  async function handleEnableBiometrics() {
    setBioModalVisible(false);
    // Test biometric prompt once to ensure authorization
    const testResult = await authenticateWithBiometrics(
      `Authenticate with ${bioCapability.label} to enable`,
    );
    finalizePinSetup(createdPin, testResult.success);
  }

  function handleSkipBiometrics() {
    setBioModalVisible(false);
    finalizePinSetup(createdPin, false);
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between px-6 pt-4 pb-8">
      {/* Top Header / Back Button */}
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (step === "CONFIRM") {
              setStep("CREATE");
              setCurrentPin("");
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(auth)/onboarding");
            }
          }}
          className="w-10 h-10 rounded-full items-center justify-center -ml-2"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View className="w-10" />
      </View>

      {/* Main Content: Title, Subtitle & PIN Indicators */}
      <View className="items-center px-4">
        <Text className="text-dark-text text-2xl font-bold tracking-tight text-center mb-2">
          {step === "CREATE" ? "Enter new PIN" : "Confirm your PIN"}
        </Text>

        <Text className="text-dark-muted text-xs text-center max-w-[280px] leading-relaxed mb-8">
          {step === "CREATE"
            ? "Create a 4-digit PIN to secure transactions, data deletion, and backups."
            : "Re-enter the 4-digit PIN to confirm your security code."}
        </Text>

        {/* 4 PIN Indicator Boxes (matching mockup #21) */}
        <View className="flex-row items-center justify-center gap-4 mb-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = currentPin.length > index;
            return (
              <View
                key={index}
                className={`w-14 h-14 rounded-2xl items-center justify-center border-2 transition-all ${
                  isFilled
                    ? "border-brand-accent bg-brand-accent/15"
                    : "border-dark-border bg-dark-surface"
                }`}
              >
                {isFilled && (
                  <View className="w-3.5 h-3.5 rounded-full bg-brand-accent" />
                )}
              </View>
            );
          })}
        </View>

        {/* Error message */}
        {errorMsg ? (
          <Text className="text-brand-expense text-xs font-semibold text-center mt-2">
            {errorMsg}
          </Text>
        ) : (
          <View className="h-6" />
        )}
      </View>

      {/* Numeric Keypad (1 to 9, 0, Backspace) */}
      <View className="w-full max-w-xs mx-auto gap-3">
        {/* Row 1 */}
        <View className="flex-row justify-between">
          {["1", "2", "3"].map((digit) => (
            <KeypadButton
              key={digit}
              value={digit}
              onPress={() => handleKeyPress(digit)}
            />
          ))}
        </View>

        {/* Row 2 */}
        <View className="flex-row justify-between">
          {["4", "5", "6"].map((digit) => (
            <KeypadButton
              key={digit}
              value={digit}
              onPress={() => handleKeyPress(digit)}
            />
          ))}
        </View>

        {/* Row 3 */}
        <View className="flex-row justify-between">
          {["7", "8", "9"].map((digit) => (
            <KeypadButton
              key={digit}
              value={digit}
              onPress={() => handleKeyPress(digit)}
            />
          ))}
        </View>

        {/* Row 4: Biometrics / 0 / Backspace */}
        <View className="flex-row justify-between items-center">
          <View className="w-20 h-16 items-center justify-center">
            {bioCapability.isAvailable && (
              <Ionicons
                name={
                  bioCapability.type === "FACE_ID"
                    ? "scan-outline"
                    : "finger-print"
                }
                size={26}
                color="#60677C"
              />
            )}
          </View>

          <KeypadButton value="0" onPress={() => handleKeyPress("0")} />

          <TouchableOpacity
            onPress={handleDeletePress}
            className="w-20 h-16 rounded-2xl items-center justify-center active:bg-dark-surface"
            activeOpacity={0.7}
          >
            <Ionicons name="backspace-outline" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer / Skip Link */}
      <View className="items-center pt-2">
        {!isFromSettings && (
          <TouchableOpacity
            onPress={() => finalizePinSetup("", false)}
            className="py-2 px-4"
            activeOpacity={0.7}
          >
            <Text className="text-dark-muted text-xs font-medium">
              Set up PIN later
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Overlay */}
      {saving && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator size="large" color="#D4F938" />
        </View>
      )}

      {/* Enable Biometrics Prompt Modal */}
      <Modal visible={bioModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="w-full max-w-sm bg-dark-surface border border-dark-border rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-brand-accent/15 border border-brand-accent/40 items-center justify-center mb-4">
              <Ionicons
                name={
                  bioCapability.type === "FACE_ID"
                    ? "scan-outline"
                    : "finger-print"
                }
                size={34}
                color="#D4F938"
              />
            </View>

            <Text className="text-dark-text text-xl font-bold text-center mb-2">
              Enable {bioCapability.label}?
            </Text>

            <Text className="text-dark-muted text-xs text-center leading-relaxed mb-6 px-3">
              Use {bioCapability.label} for effortless unlocking and instant
              verification when deleting assets or retrieving backups.
            </Text>

            <TouchableOpacity
              onPress={handleEnableBiometrics}
              className="w-full py-4 rounded-full bg-brand-accent items-center justify-center mb-3 shadow-lg active:opacity-90"
              activeOpacity={0.8}
            >
              <Text className="text-dark-bg font-bold text-sm tracking-wide">
                Enable {bioCapability.label}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkipBiometrics}
              className="py-2.5 px-6 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-dark-muted font-medium text-xs">
                Use PIN Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function KeypadButton({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-20 h-16 rounded-2xl items-center justify-center bg-dark-surface/80 border border-dark-border/40 active:bg-brand-accent/20 active:border-brand-accent/40"
      activeOpacity={0.6}
    >
      <Text className="text-dark-text text-2xl font-bold">{value}</Text>
    </TouchableOpacity>
  );
}
