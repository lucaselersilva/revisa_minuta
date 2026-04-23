import { createClient } from "@/lib/supabase/server";
import type { CaseStatus } from "@/types/database";
import type { CaseDetail, CaseListItem } from "@/features/cases/types";

type GetCasesFilters = {
  status?: string;
  taxonomyId?: string;
};

export async function getCases(filters: GetCasesFilters = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("AA_cases")
    .select(
      `
      *,
      taxonomy:AA_taxonomies(id, code, name),
      responsible_lawyer:AA_profiles!AA_cases_responsible_lawyer_id_fkey(id, full_name)
    `
    )
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status as CaseStatus);
  }

  if (filters.taxonomyId) {
    query = query.eq("taxonomy_id", filters.taxonomyId);
  }

  const { data, error } = await query.returns<CaseListItem[]>();

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function getCaseCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("AA_cases")
    .select("id", { count: "exact", head: true });

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getCaseById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("AA_cases")
    .select(
      `
      *,
      taxonomy:AA_taxonomies(id, code, name),
      responsible_lawyer:AA_profiles!AA_cases_responsible_lawyer_id_fkey(id, full_name),
      parties:AA_case_parties(*),
      entity_links:AA_case_entity_links(id, entity:AA_case_entities(*)),
      documents:AA_case_documents(*),
      history:AA_case_history(*, performer:AA_profiles!AA_case_history_performed_by_fkey(id, full_name))
    `
    )
    .eq("id", id)
    .single<CaseDetail>();

  if (error) {
    return null;
  }

  return {
    ...data,
    parties: [...(data.parties ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    documents: [...(data.documents ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    history: [...(data.history ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  };
}
