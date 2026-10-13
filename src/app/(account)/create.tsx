import { useLocalSearchParams } from "expo-router";
import React from "react";
import { AccountForm } from "../../components/accounts/AccountForm";
import { LiquidAssetType } from "../../db/schema";

export default function CreateAccountRoute() {
  const params = useLocalSearchParams<{
    type?: LiquidAssetType;
  }>();

  return (
    <AccountForm
      mode="create"
      defaultType={params.type || "BANK"}
    />
  );
}
