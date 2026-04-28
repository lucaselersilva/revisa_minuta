import { createClient } from "@/lib/supabase/server";
import type { Portfolio } from "@/types/database";

export async function getPortfolios() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("AA_portfolios")
    .select("*")
    .order("name", { ascending: true })
    .returns<Portfolio[]>();

  if (error) {
    return [];
  }

  return data ?? [];
}
