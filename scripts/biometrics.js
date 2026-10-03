import React from 'react';
import { View, Button, Alert } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export default function App() {
  const handleBiometricAuth = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();

      if (available && (biometryType === BiometryTypes.FaceID || biometryType === BiometryTypes.TouchID || biometryType === BiometryTypes.Biometrics)) {
        
        const result = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm fingerprint or Face ID',
        });

        if (result.success) {
          Alert.alert('Success', 'Authenticated successfully');
        } else {
          Alert.alert('Cancelled', 'User cancelled biometric prompt');
        }
      } else {
        Alert.alert('Unavailable', 'Biometrics are not supported or configured on this device.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Authenticate" onPress={handleBiometricAuth} />
    </View>
  );
}
