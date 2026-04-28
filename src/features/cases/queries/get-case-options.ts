import { createClient } from "@/lib/supabase/server";
import type { CaseEntity, Portfolio, Profile, Taxonomy } from "@/types/database";

export async function getCaseSelectOptions() {
  const supabase = await createClient();

  const [portfoliosResult, taxonomiesResult, lawyersResult, entitiesResult] = await Promise.all([
    supabase
      .from("AA_portfolios")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<Portfolio[]>(),
    supabase
      .from("AA_taxonomies")
      .select("*")
      .eq("is_active", true)
      .order("code", { ascending: true })
      .returns<Taxonomy[]>(),
    supabase
      .from("AA_profiles")
      .select("*")
      .eq("is_active", true)
      .order("full_name", { ascending: true })
      .returns<Profile[]>(),
    supabase
      .from("AA_case_entities")
      .select("*")
      .order("name", { ascending: true })
      .returns<CaseEntity[]>()
  ]);

  return {
    portfolios: portfoliosResult.data ?? [],
    taxonomies: taxonomiesResult.data ?? [],
    lawyers: lawyersResult.data ?? [],
    entities: entitiesResult.data ?? []
  };
}
