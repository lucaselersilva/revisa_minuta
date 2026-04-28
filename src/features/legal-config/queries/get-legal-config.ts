import { createClient } from "@/lib/supabase/server";
import type { PortfolioCaseTemplate, PortfolioDocumentRequirement, PortfolioLegalThesis } from "@/types/database";

export async function getLegalConfiguration() {
  const supabase = await createClient();

  const [requirementsResult, thesesResult, templatesResult] = await Promise.all([
    supabase
      .from("AA_portfolio_document_requirements")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PortfolioDocumentRequirement[]>(),
    supabase
      .from("AA_portfolio_legal_theses")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PortfolioLegalThesis[]>(),
    supabase
      .from("AA_portfolio_case_templates")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PortfolioCaseTemplate[]>()
  ]);

  return {
    requirements: requirementsResult.data ?? [],
    theses: thesesResult.data ?? [],
    templates: templatesResult.data ?? []
  };
}

export async function getActiveLegalConfigurationForPortfolio(portfolioId: string, taxonomyId: string | null) {
  const supabase = await createClient();

  const [requirementsResult, thesesResult, templatesResult] = await Promise.all([
    supabase
      .from("AA_portfolio_document_requirements")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_active", true)
      .returns<PortfolioDocumentRequirement[]>(),
    supabase
      .from("AA_portfolio_legal_theses")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_active", true)
      .returns<PortfolioLegalThesis[]>(),
    supabase
      .from("AA_portfolio_case_templates")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_active", true)
      .returns<PortfolioCaseTemplate[]>()
  ]);

  const requirements = (requirementsResult.data ?? []).filter((item) => !item.taxonomy_id || item.taxonomy_id === taxonomyId);
  const theses = (thesesResult.data ?? []).filter((item) => !item.taxonomy_id || item.taxonomy_id === taxonomyId);
  const templates = (templatesResult.data ?? []).filter((item) => item.taxonomy_id === taxonomyId);

  return { requirements, theses, templates };
}
