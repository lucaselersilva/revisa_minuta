import { getCaseById } from "@/features/cases/queries/get-cases";
import { writeCaseHistory } from "@/features/cases/services/case-history-service";
import { isPreAnalysisEligibleDocumentType } from "@/features/document-ingestion/lib/eligible-documents";
import { analyzeProcessedDocument } from "@/features/document-ingestion/services/analyze-processed-document";
import { parseDocumentByMimeType } from "@/features/document-ingestion/services/parser-dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";

export async function processCaseInitialDocuments(caseId: string, profile: Profile) {
  const caseItem = await getCaseById(caseId);

  if (!caseItem || caseItem.office_id !== profile.office_id) {
    return { ok: false, message: "Processo nao encontrado." };
  }

  const supabase = createAdminClient();
  const eligibleDocuments = caseItem.documents.filter((document) =>
    isPreAnalysisEligibleDocumentType(document.document_type)
  );

  if (eligibleDocuments.length === 0) {
    return { ok: false, message: "Nao ha documentos elegiveis para a pre-analise." };
  }

  await writeCaseHistory({
    caseId,
    action: "pre_analysis.ingestion.started",
    profile,
    metadata: { document_count: eligibleDocuments.length }
  });

  for (const document of eligibleDocuments) {
    await supabase.from("AA_document_ingestions").upsert(
      {
        office_id: profile.office_id,
        case_document_id: document.id,
        status: "processing",
        parser_type: null,
        extracted_text: null,
        extracted_text_length: 0,
        detected_language: null,
        error_message: null,
        metadata: { file_name: document.file_name },
        processed_at: null
      },
      { onConflict: "case_document_id" }
    );

    const downloadResult = await supabase.storage.from("aa-case-files").download(document.file_path);

    if (downloadResult.error) {
      await supabase
        .from("AA_document_ingestions")
        .update({
          office_id: profile.office_id,
          status: "failed",
          error_message: "Nao foi possivel baixar o arquivo para processamento.",
          processed_at: new Date().toISOString()
        })
        .eq("case_document_id", document.id);

      await writeCaseHistory({
        caseId,
        action: "pre_analysis.document.failed",
        profile,
        metadata: { document_id: document.id, file_name: document.file_name }
      });
      continue;
    }

    const buffer = Buffer.from(await downloadResult.data.arrayBuffer());
    const parsed = await parseDocumentByMimeType({ mimeType: document.mime_type, buffer });
    let analysisMetadata: Record<string, unknown> = {};

    if (parsed.status === "processed" && parsed.extractedText) {
      const analysis = await analyzeProcessedDocument({
        document,
        extractedText: parsed.extractedText,
        fileBuffer: buffer,
        parserType: parsed.parserType,
        parserMetadata: parsed.metadata
      });

      analysisMetadata =
        analysis.status === "completed"
          ? {
              analysis_status: "completed",
              analysis_model_name: analysis.modelName,
              analysis_prompt_version: analysis.promptVersion,
              document_analysis: analysis.report
            }
          : {
              analysis_status: analysis.status,
              analysis_prompt_version: analysis.promptVersion,
              analysis_error_message: analysis.errorMessage
            };
    }

    await supabase.from("AA_document_ingestions").upsert(
      {
        office_id: profile.office_id,
        case_document_id: document.id,
        status: parsed.status,
        parser_type: parsed.parserType,
        extracted_text: parsed.extractedText,
        extracted_text_length: parsed.extractedTextLength,
        detected_language: parsed.detectedLanguage,
        error_message: parsed.errorMessage,
        metadata: {
          ...parsed.metadata,
          ...analysisMetadata,
          file_name: document.file_name,
          mime_type: document.mime_type
        },
        processed_at: new Date().toISOString()
      },
      { onConflict: "case_document_id" }
    );

    await writeCaseHistory({
      caseId,
      action:
        parsed.status === "processed"
          ? "pre_analysis.document.processed"
          : parsed.status === "unsupported"
            ? "pre_analysis.document.unsupported"
            : parsed.status === "empty_text"
              ? "pre_analysis.document.empty_text"
              : "pre_analysis.document.failed",
      profile,
        metadata: {
          document_id: document.id,
          file_name: document.file_name,
          status: parsed.status,
          analysis_status: analysisMetadata.analysis_status ?? null
        }
      });
  }

  return { ok: true, message: "Processamento documental concluido." };
}
