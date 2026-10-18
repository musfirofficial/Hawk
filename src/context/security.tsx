import { eq } from "drizzle-orm";
import React, { createContext, useContext, useEffect, useState } from "react";
import { SecurityGuardModal } from "../components/SecurityGuardModal";
import { db, ensureDatabaseInitialized } from "../db";
import * as schema from "../db/schema";
import { SecurityRuleKey, SecurityRules } from "../db/schema";

export interface SecurityRequest {
  ruleKey?: SecurityRuleKey;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export interface SecurityContextType {
  requireSecurityAuth: (request: SecurityRequest) => void;
  rules: SecurityRules | null;
  updateRule: (key: SecurityRuleKey, enabled: boolean) => Promise<void>;
  reloadRules: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined
);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [activeRequest, setActiveRequest] = useState<SecurityRequest | null>(
    null
  );
  const [rules, setRules] = useState<SecurityRules | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  function loadRules() {
    try {
      ensureDatabaseInitialized();
      const rows = db.select().from(schema.securityRules).limit(1).all();
      if (rows && rows.length > 0) {
        setRules(rows[0]);
      }
    } catch (err) {
      console.warn("Failed to load security rules:", err);
    }
  }

  async function updateRule(key: SecurityRuleKey, enabled: boolean) {
    try {
      ensureDatabaseInitialized();
      db.update(schema.securityRules)
        .set({
          [key]: enabled,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.securityRules.id, 1))
        .run();
      loadRules();
    } catch (err) {
      console.error("Failed to update security rule:", err);
      throw err;
    }
  }

  function requireSecurityAuth(request: SecurityRequest) {
    if (request.ruleKey) {
      // Per-action security checks have been removed from the app
      request.onSuccess();
      return;
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
        rules,
        updateRule,
        reloadRules: loadRules,
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
