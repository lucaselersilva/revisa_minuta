"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";
import {
  extractPersistedCaseTaxonomySuggestion,
  type PersistedCaseTaxonomySuggestion
} from "@/features/cases/lib/case-taxonomy-classification-schema";
import { getCaseById } from "@/features/cases/queries/get-cases";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { generateCaseTaxonomySuggestion } from "@/features/cases/services/case-taxonomy-classification-service";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/services/audit-log-service";

type TaxonomySuggestionActionResult = {
  ok: boolean;
  message: string;
  suggestion?: PersistedCaseTaxonomySuggestion;
};

async function requireProfile() {
  const { profile } = await getCurrentProfile();
  return profile?.office_id ? profile : null;
}

async function getCadastroInicialStepMetadata(caseId: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("AA_case_workflow_steps")
    .select("metadata")
    .eq("case_id", caseId)
    .eq("step_key", "cadastro_inicial")
    .single<{ metadata: Record<string, unknown> | null }>();

  return result.data?.metadata ?? {};
}

export async function generateCaseTaxonomySuggestionAction(caseId: string): Promise<TaxonomySuggestionActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  try {
    const supabase = await createClient();
    const suggestion = await generateCaseTaxonomySuggestion(caseId, profile);
    const currentMetadata = await getCadastroInicialStepMetadata(caseId);
    const metadata = {
      ...currentMetadata,
      ai_taxonomy_classification: suggestion
    };

    const { error } = await supabase
      .from("AA_case_workflow_steps")
      .update({ metadata })
      .eq("case_id", caseId)
      .eq("step_key", "cadastro_inicial");

    if (error) {
      return { ok: false, message: "Nao foi possivel salvar a sugestao de taxonomia." };
    }

    await writeCaseHistory({
      caseId,
      action: "taxonomy.suggestion.generated",
      profile,
      metadata: {
        taxonomy_code: suggestion.recommendation.taxonomy_code,
        confidence: suggestion.recommendation.confidence
      }
    });

    await writeAuditLog({
      profile,
      action: "taxonomy.suggestion.generated",
      entityType: "AA_case_workflow_steps",
      entityId: null,
      metadata: {
        case_id: caseId,
        taxonomy_code: suggestion.recommendation.taxonomy_code,
        confidence: suggestion.recommendation.confidence
      }
    });

    revalidatePath(`/app/cases/${caseId}`);
    revalidatePath("/app/cases");
    return {
      ok: true,
      message: suggestion.recommendation.taxonomy_code
        ? `Sugestao gerada: ${suggestion.recommendation.taxonomy_code}.`
        : "Sugestao gerada, mas a IA indicou classificacao inconclusiva.",
      suggestion
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Nao foi possivel gerar a sugestao de taxonomia."
    };
  }
}

export async function applyCaseTaxonomySuggestionAction(caseId: string): Promise<TaxonomySuggestionActionResult> {
  const profile = await requireProfile();

  if (!profile) {
    return { ok: false, message: "Perfil interno nao encontrado." };
  }

  const supabase = await createClient();
  const [caseItem, currentMetadata] = await Promise.all([getCaseById(caseId), getCadastroInicialStepMetadata(caseId)]);

  if (!caseItem || caseItem.office_id !== profile.office_id) {
    return { ok: false, message: "Processo nao encontrado." };
  }

  const suggestion = extractPersistedCaseTaxonomySuggestion(currentMetadata);

  if (!suggestion?.recommendation.taxonomy_id || !suggestion.recommendation.taxonomy_code) {
    return { ok: false, message: "Nao ha sugestao aplicavel para este processo." };
  }

  const { error } = await supabase
    .from("AA_cases")
    .update({
      taxonomy_id: suggestion.recommendation.taxonomy_id
    })
    .eq("id", caseId)
    .eq("office_id", profile.office_id);

  if (error) {
    return { ok: false, message: "Nao foi possivel aplicar a taxonomia sugerida." };
  }

  const appliedSuggestion: PersistedCaseTaxonomySuggestion = {
    ...suggestion,
    application: {
      applied_at: new Date().toISOString(),
      applied_by: profile.id,
      previous_taxonomy_id: caseItem.taxonomy?.id ?? null,
      previous_taxonomy_code: caseItem.taxonomy?.code ?? null
    }
  };

  const metadata = {
    ...currentMetadata,
    ai_taxonomy_classification: appliedSuggestion
  };

  await supabase
    .from("AA_case_workflow_steps")
    .update({ metadata })
    .eq("case_id", caseId)
    .eq("step_key", "cadastro_inicial");

  await writeCaseHistory({
    caseId,
    action: "taxonomy.suggestion.applied",
    profile,
    metadata: {
      previous_taxonomy_code: caseItem.taxonomy?.code ?? null,
      applied_taxonomy_code: suggestion.recommendation.taxonomy_code
    }
  });

  await writeAuditLog({
    profile,
    action: "taxonomy.suggestion.applied",
    entityType: "AA_cases",
    entityId: caseId,
    metadata: {
      previous_taxonomy_code: caseItem.taxonomy?.code ?? null,
      applied_taxonomy_code: suggestion.recommendation.taxonomy_code
    }
  });

  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath("/app/cases");
  return {
    ok: true,
    message: `Taxonomia ${suggestion.recommendation.taxonomy_code} aplicada ao processo.`,
    suggestion: appliedSuggestion
  };
}
