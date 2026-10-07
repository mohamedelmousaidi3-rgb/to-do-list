import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Keep the interface visible while the project is being configured.  Without
// this fallback, createClient throws before React can render anything and the
// browser only shows a blank page.
export const isSupabaseConfigured = Boolean(
  url && key &&
  !url.includes("YOUR_PROJECT") &&
  !key.includes("YOUR_SUPABASE")
);

export const supabase = createClient(
  isSupabaseConfigured ? url : "https://placeholder.supabase.co",
  isSupabaseConfigured ? key : "placeholder-key"
);
