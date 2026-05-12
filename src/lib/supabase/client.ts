import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseKey, getSupabaseUrl } from "./config";

function getEnv() {
  return {
    url: getSupabaseUrl() || "https://placeholder.local",
    key: getSupabaseKey() || "placeholder",
  };
}

export function createClient() {
  const { url, key } = getEnv();
  return createBrowserClient(url, key);
}
