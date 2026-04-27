import { createClient } from "@/lib/supabase/server";
import type { CaseEntity } from "@/types/database";

export async function getCaseEntities() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("AA_case_entities")
    .select("*")
    .order("name", { ascending: true })
    .returns<CaseEntity[]>();

  if (error) {
    return [];
  }

  return data ?? [];
}
