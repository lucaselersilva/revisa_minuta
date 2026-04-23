import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

type AuditInput = {
  profile: Profile;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog({
  profile,
  action,
  entityType,
  entityId,
  metadata = {}
}: AuditInput) {
  const supabase = await createClient();

  await supabase.from("AA_audit_logs").insert({
    office_id: profile.office_id,
    actor_profile_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
}
