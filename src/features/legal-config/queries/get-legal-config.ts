import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioCaseTemplate,
  PortfolioDocumentRequirement,
  PortfolioLegalThesis,
  PortfolioPromptProfile,
  PromptAnalysisType
} from "@/types/database";

export async function getLegalConfiguration() {
  const supabase = await createClient();

  const [requirementsResult, thesesResult, templatesResult, promptProfilesResult] = await Promise.all([
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
      .returns<PortfolioCaseTemplate[]>(),
    supabase
      .from("AA_portfolio_prompt_profiles")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PortfolioPromptProfile[]>()
  ]);

  return {
    requirements: requirementsResult.data ?? [],
    theses: thesesResult.data ?? [],
    templates: templatesResult.data ?? [],
    promptProfiles: promptProfilesResult.data ?? []
  };
}

export async function getActiveLegalConfigurationForPortfolio(portfolioId: string, taxonomyId: string | null) {
  const supabase = await createClient();

  const [requirementsResult, thesesResult, templatesResult, promptProfilesResult] = await Promise.all([
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
      .returns<PortfolioCaseTemplate[]>(),
    supabase
      .from("AA_portfolio_prompt_profiles")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_active", true)
      .returns<PortfolioPromptProfile[]>()
  ]);

  const requirements = (requirementsResult.data ?? []).filter((item) => !item.taxonomy_id || item.taxonomy_id === taxonomyId);
  const theses = (thesesResult.data ?? []).filter((item) => !item.taxonomy_id || item.taxonomy_id === taxonomyId);
  const templates = (templatesResult.data ?? []).filter((item) => item.taxonomy_id === taxonomyId);
  const promptProfiles = (promptProfilesResult.data ?? []).filter((item) => !item.taxonomy_id || item.taxonomy_id === taxonomyId);

  return { requirements, theses, templates, promptProfiles };
}

export function resolvePromptProfile(
  profiles: PortfolioPromptProfile[],
  analysisType: PromptAnalysisType,
  taxonomyId: string | null
) {
  const candidates = profiles.filter((item) => item.analysis_type === analysisType);

  return [...candidates].sort((left, right) => {
    const leftSpecificity = left.taxonomy_id === taxonomyId ? 0 : left.taxonomy_id ? 1 : 2;
    const rightSpecificity = right.taxonomy_id === taxonomyId ? 0 : right.taxonomy_id ? 1 : 2;

    if (leftSpecificity !== rightSpecificity) {
      return leftSpecificity - rightSpecificity;
    }

    return right.updated_at.localeCompare(left.updated_at);
  })[0] ?? null;
}
