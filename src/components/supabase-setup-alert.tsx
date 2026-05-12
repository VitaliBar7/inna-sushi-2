"use client";

import { Alert } from "@heroui/react";

export function SupabaseSetupAlert() {
  return (
    <Alert
      status="warning"
      className="mx-auto max-w-xl"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>חיבור Supabase</Alert.Title>
        <Alert.Description>
          צור קובץ <code className="text-foreground/90">.env.local</code> לפי{" "}
          <code className="text-foreground/90">.env.local.example</code>. הרץ את{" "}
          <code className="text-foreground/90">supabase/schema.sql</code> ב-SQL Editor ואז רענן.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
