import React, { createContext, useContext, useState } from "react";
import { SecurityGuardModal } from "../components/SecurityGuardModal";

export interface SecurityRequest {
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export interface SecurityContextType {
  requireSecurityAuth: (request: SecurityRequest) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined
);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [activeRequest, setActiveRequest] = useState<SecurityRequest | null>(
    null
  );

  function requireSecurityAuth(request: SecurityRequest) {
    setActiveRequest(request);
  }

  function handleSuccess() {
    const callback = activeRequest?.onSuccess;
    setActiveRequest(null);
    if (callback) {
      callback();
    }
  }

  function handleCancel() {
    const callback = activeRequest?.onCancel;
    setActiveRequest(null);
    if (callback) {
      callback();
    }
  }

  return (
    <SecurityContext.Provider value={{ requireSecurityAuth }}>
      {children}
      {activeRequest && (
        <SecurityGuardModal
          visible={true}
          title={activeRequest.title}
          description={activeRequest.description}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </SecurityContext.Provider>
  );
}

export function useSecurityGuard() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error(
      "useSecurityGuard must be used within a SecurityProvider"
    );
  }
  return context;
}
