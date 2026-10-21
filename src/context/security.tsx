import { eq } from "drizzle-orm";
import React, { createContext, useContext, useEffect, useState } from "react";
import { SecurityGuardModal } from "../components/SecurityGuardModal";
import { useAuth } from "../context/auth";
import { db } from "../db";
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
  const { hasPin, settings } = useAuth();
  const [activeRequest, setActiveRequest] = useState<SecurityRequest | null>(
    null
  );
  const [rules, setRules] = useState<SecurityRules | null>(() => {
    try {
      const rows = db.select().from(schema.securityRules).limit(1).all();
      return rows && rows.length > 0 ? rows[0] : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    loadRules();
  }, []);

  function loadRules() {
    try {
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
    // If user has not set up a PIN, or PIN security is disabled, do not block the action
    if (!hasPin || !settings?.pinEnabled) {
      request.onSuccess();
      return;
    }

    // If the request specifies a ruleKey, check if that security rule is enabled
    if (request.ruleKey) {
      const isRuleActive = rules ? Boolean(rules[request.ruleKey]) : true;
      if (!isRuleActive) {
        request.onSuccess();
        return;
      }
    }

    // Rule is active and PIN is set up: prompt user for security authorization
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
