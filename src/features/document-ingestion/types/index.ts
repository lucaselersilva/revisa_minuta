import type {
  AuthorExternalProcess,
  AuthorExternalSearch,
  CaseDocument,
  CaseParty,
  DocumentIngestion,
  PreAnalysisAcknowledgement,
  PreAnalysisReport,
  Profile
} from "@/types/database";

export type DocumentAnalysisKind =
  | "email_print"
  | "whatsapp_print"
  | "financial_record"
  | "platform_print"
  | "identity_document"
  | "procuration"
  | "travel_record"
  | "general_attachment";

export type DocumentAnalysisSeverity = "low" | "medium" | "high";
export type DocumentAnalysisConfidence = "low" | "medium" | "high";

export type DocumentAnalysisFinding = {
  title: string;
  category: string;
  severity: DocumentAnalysisSeverity;
  evidence: string;
};

export type StructuredDocumentAnalysis = {
  inferred_document_kind: DocumentAnalysisKind;
  summary: string;
  participants: string[];
  dates: string[];
  monetary_values: string[];
  key_findings: DocumentAnalysisFinding[];
  defensive_implications: string[];
  confidence: DocumentAnalysisConfidence;
};

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

export type AuthorExternalSearchItem = AuthorExternalSearch & {
  party: Pick<CaseParty, "id" | "name" | "role" | "document"> | null;
  processes: AuthorExternalProcess[];
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
  externalAuthorSearches: AuthorExternalSearchItem[];
  externalAuthorSearchMetrics: {
    configured: boolean;
    authorCount: number;
    searchesCount: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
    identifiedCpfCount: number;
    processCount: number;
    lastRequestedAt: string | null;
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
