alter table public."AA_case_documents"
  drop constraint if exists "AA_case_documents_document_type_check";

alter table public."AA_case_documents"
  add constraint "AA_case_documents_document_type_check"
  check (
    document_type in (
      'initial_petition',
      'author_documents',
      'author_identity_document',
      'author_address_proof',
      'author_payment_proof',
      'author_screen_capture',
      'initial_amendment',
      'initial_amendment_documents',
      'defense',
      'defense_documents',
      'other'
    )
  );
