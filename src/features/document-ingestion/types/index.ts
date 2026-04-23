import type {
  CaseDocument,
  DocumentIngestion,
  PreAnalysisAcknowledgement,
  PreAnalysisReport,
  Profile
} from "@/types/database";

export type ParserResult = {
  status: DocumentIngestion["status"];
  parserType: string | null;
  extractedText: string | null;
  extractedTextLength: number;
  detectedLanguage: string | null;
  metadata: Record<string, unknown>;
  errorMessage: string | null;
};

export type CaseDocumentIngestionItem = {
  document: CaseDocument;
  ingestion: DocumentIngestion | null;
};

export type PreAnalysisSnapshot = {
  eligibleDocuments: CaseDocumentIngestionItem[];
  latestCompletedReport: (PreAnalysisReport & { generated_profile: Pick<Profile, "id" | "full_name"> | null }) | null;
  latestReport: (PreAnalysisReport & { generated_profile: Pick<Profile, "id" | "full_name"> | null }) | null;
  reports: Array<
    PreAnalysisReport & {
      generated_profile: Pick<Profile, "id" | "full_name"> | null;
    }
  >;
  acknowledgements: Array<
    PreAnalysisAcknowledgement & {
      acknowledger: Pick<Profile, "id" | "full_name"> | null;
    }
  >;
  latestAcknowledgementForLatestReport: (PreAnalysisAcknowledgement & {
    acknowledger: Pick<Profile, "id" | "full_name"> | null;
  }) | null;
  metrics: {
    eligibleCount: number;
    processedCount: number;
    failedCount: number;
    unsupportedCount: number;
    emptyTextCount: number;
    pendingCount: number;
    totalExtractedCharacters: number;
  };
  canGenerateReport: boolean;
  generationRequirements: string[];
};

export type PreAnalysisContext = {
  caseId: string;
  inputSummary: Record<string, unknown>;
  promptContext: string;
  metrics: {
    eligibleCount: number;
    processedCount: number;
    unsupportedCount: number;
    emptyTextCount: number;
    totalCharacters: number;
  };
};
