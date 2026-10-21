import * as NavigationBar from "expo-navigation-bar";
import React, { useEffect } from "react";
import { Modal, ModalProps, Platform } from "react-native";

export interface HawkModalProps extends ModalProps {
  children: React.ReactNode;
}

export function HawkModal({
  visible,
  children,
  transparent = true,
  animationType = "slide",
  statusBarTranslucent = true,
  navigationBarTranslucent = true,
  ...props
}: HawkModalProps) {
  useEffect(() => {
    if (Platform.OS === "android" && visible) {
      // "light" style sets light icon/buttons for dark background and prevents Android light scrim
      try {
        NavigationBar.setStyle("light");
      } catch {}
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      statusBarTranslucent={statusBarTranslucent}
      navigationBarTranslucent={navigationBarTranslucent}
      {...props}
    >
      {Platform.OS === "android" ? (
        <NavigationBar.NavigationBar style="light" />
      ) : null}
      {children}
    </Modal>
  );
}
