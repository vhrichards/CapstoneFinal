import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase-env";

export const createClient = () => {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseEnv();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env vars are missing.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
};
