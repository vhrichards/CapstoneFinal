import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase-env";

export const createClient = async () => {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseEnv();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env vars are missing.");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore writes in contexts where cookie mutation is unavailable.
        }
      },
    },
  });
};
