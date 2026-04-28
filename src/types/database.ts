export type UserRole = "admin" | "lawyer";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type CaseStatus = "draft" | "in_progress" | "review_pending" | "completed";
export type CasePartyRole = "author" | "defendant" | "third_party";
export type CaseDocumentType =
  | "initial_petition"
  | "author_documents"
  | "author_identity_document"
  | "author_address_proof"
  | "author_payment_proof"
  | "author_screen_capture"
  | "initial_amendment"
  | "initial_amendment_documents"
  | "defense"
  | "defense_documents"
  | "other";
export type CaseDocumentStage = "initial" | "pre_analysis" | "defense" | "final_review";
export type WorkflowStepKey =
  | "cadastro_inicial"
  | "documentos_autor"
  | "emenda_inicial"
  | "pre_analise"
  | "defesa"
  | "revisao_final"
  | "relatorio";
export type WorkflowStatus = "not_started" | "in_progress" | "blocked" | "completed";
export type WorkflowStepStatus = "locked" | "available" | "in_progress" | "completed" | "skipped";
export type DocumentIngestionStatus = "pending" | "processing" | "processed" | "failed" | "unsupported" | "empty_text";
export type PreAnalysisReportStatus = "draft" | "completed" | "failed";
export type AuthorExternalSearchStatus = "pending" | "completed" | "failed" | "not_found";
export type PromptAnalysisType = "pre_analysis" | "defense_conformity";

export type Office = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type Portfolio = {
  id: string;
  office_id: string;
  name: string;
  slug: string;
  description: string | null;
  segment: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  office_id: string | null;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserInvite = {
  id: string;
  office_id: string | null;
  email: string;
  role: UserRole;
  invited_by: string | null;
  status: InviteStatus;
  created_at: string;
  updated_at: string;
};

export type Taxonomy = {
  id: string;
  office_id: string | null;
  portfolio_id: string | null;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  office_id: string | null;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Case = {
  id: string;
  office_id: string;
  portfolio_id: string;
  case_number: string | null;
  title: string | null;
  description: string | null;
  represented_entity_notes: string | null;
  status: CaseStatus;
  taxonomy_id: string | null;
  responsible_lawyer_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseParty = {
  id: string;
  case_id: string;
  role: CasePartyRole;
  name: string;
  document: string | null;
  created_at: string;
};

export type CaseEntity = {
  id: string;
  office_id: string;
  portfolio_id: string;
  name: string;
  document: string | null;
  created_at: string;
};

export type CaseEntityLink = {
  id: string;
  case_id: string;
  entity_id: string;
};

export type CaseDocument = {
  id: string;
  case_id: string;
  uploaded_by: string | null;
  document_type: CaseDocumentType;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  stage: CaseDocumentStage;
  created_at: string;
};

export type CaseHistory = {
  id: string;
  case_id: string;
  action: string;
  performed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CaseWorkflow = {
  id: string;
  case_id: string;
  current_step: WorkflowStepKey;
  status: WorkflowStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseWorkflowStep = {
  id: string;
  case_id: string;
  step_key: WorkflowStepKey;
  step_order: number;
  status: WorkflowStepStatus;
  is_required: boolean;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WorkflowRule = {
  id: string;
  office_id: string;
  portfolio_id: string;
  step_key: string;
  rule_key: string;
  rule_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioDocumentRequirement = {
  id: string;
  office_id: string;
  portfolio_id: string;
  taxonomy_id: string | null;
  step_key: WorkflowStepKey;
  document_type: CaseDocumentType;
  requirement_label: string;
  requirement_details: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioLegalThesis = {
  id: string;
  office_id: string;
  portfolio_id: string;
  taxonomy_id: string | null;
  title: string;
  summary: string;
  legal_basis: string | null;
  applicability_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioCaseTemplate = {
  id: string;
  office_id: string;
  portfolio_id: string;
  taxonomy_id: string;
  title: string;
  template_markdown: string;
  usage_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioPromptProfile = {
  id: string;
  office_id: string;
  portfolio_id: string;
  taxonomy_id: string | null;
  analysis_type: PromptAnalysisType;
  profile_name: string;
  instruction_priority: string | null;
  must_check_items: string | null;
  forbidden_assumptions: string | null;
  preferred_reasoning_style: string | null;
  output_emphasis: string | null;
  additional_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentIngestion = {
  id: string;
  office_id: string;
  case_document_id: string;
  status: DocumentIngestionStatus;
  parser_type: string | null;
  extracted_text: string | null;
  extracted_text_length: number | null;
  detected_language: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PreAnalysisReport = {
  id: string;
  office_id: string;
  case_id: string;
  version: number;
  status: PreAnalysisReportStatus;
  model_provider: string;
  model_name: string | null;
  input_summary: Record<string, unknown>;
  prompt_version: string | null;
  report_json: Record<string, unknown> | null;
  report_markdown: string | null;
  generated_by: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PreAnalysisAcknowledgement = {
  id: string;
  office_id: string;
  case_id: string;
  report_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
};

export type AuthorExternalSearch = {
  id: string;
  office_id: string;
  case_id: string;
  party_id: string;
  provider: "escavador";
  cpf: string;
  tribunal: string;
  status: AuthorExternalSearchStatus;
  provider_search_id: string | null;
  provider_result_url: string | null;
  request_payload: Record<string, unknown>;
  raw_response: Record<string, unknown>;
  error_message: string | null;
  requested_by: string | null;
  requested_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthorExternalProcess = {
  id: string;
  office_id: string;
  case_id: string;
  party_id: string;
  search_id: string;
  provider: "escavador";
  process_number: string;
  tribunal: string | null;
  role_hint: string | null;
  subject_summary: string | null;
  last_movement_at: string | null;
  source_link: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
