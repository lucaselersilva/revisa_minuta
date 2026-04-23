import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("AA_profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error) {
    return { user, profile: null };
  }

  return { user, profile };
});

export async function requireAdminProfile() {
  const { profile } = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return profile;
}
