import { createClient } from "@/lib/supabase/server";
import type { Profile, UserInvite } from "@/types/database";

export async function getUsersAndInvites() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: invites }] = await Promise.all([
    supabase
      .from("AA_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Profile[]>(),
    supabase
      .from("AA_user_invites")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<UserInvite[]>()
  ]);

  return {
    profiles: profiles ?? [],
    invites: invites ?? []
  };
}
