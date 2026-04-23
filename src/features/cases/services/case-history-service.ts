import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

type CaseHistoryInput = {
  caseId: string;
  action: string;
  profile: Profile;
  metadata?: Record<string, unknown>;
};

export async function writeCaseHistory({
  caseId,
  action,
  profile,
  metadata = {}
}: CaseHistoryInput) {
  const supabase = await createClient();

  await supabase.from("AA_case_history").insert({
    case_id: caseId,
    action,
    performed_by: profile.id,
    metadata
  });
}
