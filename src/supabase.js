import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://qvyammfynftltyyhszwj.supabase.co",
  "sb_publishable_LLceamR3ZgE4OrScWnZtHg_CXCT2K3z",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function pictureUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//.test(value)) return value;
  return new URL(value.replace(/^\//, ""), document.baseURI).href;
}
