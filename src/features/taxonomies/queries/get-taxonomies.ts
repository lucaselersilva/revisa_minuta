import { createClient } from "@/lib/supabase/server";
import type { Taxonomy } from "@/types/database";

export async function getTaxonomies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("AA_taxonomies")
    .select("*")
    .order("code", { ascending: true })
    .returns<Taxonomy[]>();

  if (error) {
    return [];
  }

  return data;
}

export async function getTaxonomyCount() {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("AA_taxonomies")
    .select("id", { count: "exact", head: true });

  if (error) {
    return 0;
  }

  return count ?? 0;
}
