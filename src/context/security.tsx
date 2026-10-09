import { eq } from "drizzle-orm";
import React, { createContext, useContext, useEffect, useState } from "react";
import { SecurityGuardModal } from "../components/SecurityGuardModal";
import { db, ensureDatabaseInitialized } from "../db";
import * as schema from "../db/schema";
import { SecurityPermission } from "../db/schema";

export interface SecurityRequest {
  actionKey?: string;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export interface SecurityContextType {
  requireSecurityAuth: (request: SecurityRequest) => void;
  permissions: SecurityPermission[];
  togglePermission: (actionKey: string, enabled: boolean) => Promise<void>;
  reloadPermissions: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined
);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [activeRequest, setActiveRequest] = useState<SecurityRequest | null>(
    null
  );
  const [permissions, setPermissions] = useState<SecurityPermission[]>([]);

  useEffect(() => {
    loadPermissions();
  }, []);

  function loadPermissions() {
    try {
      ensureDatabaseInitialized();
      const rows = db.select().from(schema.securityPermissions).all();
      setPermissions(rows);
    } catch (err) {
      console.warn("Failed to load security permissions:", err);
    }
  }

  async function togglePermission(actionKey: string, enabled: boolean) {
    try {
      ensureDatabaseInitialized();
      db.update(schema.securityPermissions)
        .set({
          isEnabled: enabled,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.securityPermissions.actionKey, actionKey))
        .run();
      loadPermissions();
    } catch (err) {
      console.error("Failed to toggle security permission:", err);
      throw err;
    }
  }

  function requireSecurityAuth(request: SecurityRequest) {
    // If an actionKey is specified, verify if protection is enabled for it
    if (request.actionKey) {
      const perm = permissions.find((p) => p.actionKey === request.actionKey);
      if (perm && !perm.isEnabled) {
        // Security check is disabled by user for this action -> bypass directly
        request.onSuccess();
        return;
      }
    }

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
    <SecurityContext.Provider
      value={{
        requireSecurityAuth,
        permissions,
        togglePermission,
        reloadPermissions: loadPermissions,
      }}
    >
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
