import React, { createContext, useCallback, useContext, useState } from "react";
import {
  AlertType,
  HawkAlertButton,
  HawkAlertModal,
} from "../components/HawkAlertModal";

export interface ShowAlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttonText?: string;
  onDismiss?: () => void;
}

export interface ShowConfirmOptions {
  title: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ShowCustomAlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons: HawkAlertButton[];
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  type: AlertType;
  buttons: HawkAlertButton[];
}

interface AlertContextType {
  showAlert: (options: ShowAlertOptions) => void;
  showConfirm: (options: ShowConfirmOptions) => void;
  showCustomAlert: (options: ShowCustomAlertOptions) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    buttons: [],
  });

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(
    ({
      title,
      message,
      type = "info",
      buttonText = "OK",
      onDismiss,
    }: ShowAlertOptions) => {
      setAlertState({
        visible: true,
        title,
        message,
        type,
        buttons: [
          {
            text: buttonText,
            style: "default",
            onPress: () => {
              if (onDismiss) onDismiss();
            },
          },
        ],
      });
    },
    []
  );

  const showConfirm = useCallback(
    ({
      title,
      message,
      type = "danger",
      confirmText = "Confirm",
      cancelText = "Cancel",
      isDestructive = true,
      onConfirm,
      onCancel,
    }: ShowConfirmOptions) => {
      setAlertState({
        visible: true,
        title,
        message,
        type,
        buttons: [
          {
            text: cancelText,
            style: "cancel",
            onPress: () => {
              if (onCancel) onCancel();
            },
          },
          {
            text: confirmText,
            style: isDestructive ? "destructive" : "default",
            onPress: () => {
              onConfirm();
            },
          },
        ],
      });
    },
    []
  );

  const showCustomAlert = useCallback(
    ({ title, message, type = "info", buttons }: ShowCustomAlertOptions) => {
      setAlertState({
        visible: true,
        title,
        message,
        type,
        buttons,
      });
    },
    []
  );

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showConfirm,
        showCustomAlert,
        closeAlert,
      }}
    >
      {children}
      <HawkAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={closeAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
