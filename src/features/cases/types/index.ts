import type {
  Case,
  CaseDocument,
  CaseEntity,
  CaseHistory,
  CaseParty,
  Portfolio,
  Profile,
  Taxonomy
} from "@/types/database";

export type CaseListItem = Case & {
  portfolio: Pick<Portfolio, "id" | "name" | "slug" | "segment"> | null;
  taxonomy: Pick<Taxonomy, "id" | "code" | "name"> | null;
  responsible_lawyer: Pick<Profile, "id" | "full_name"> | null;
};

export type CaseDetail = CaseListItem & {
  parties: CaseParty[];
  entity_links: Array<{
    id: string;
    entity: CaseEntity | null;
  }>;
  documents: CaseDocument[];
  history: Array<
    CaseHistory & {
      performer: Pick<Profile, "id" | "full_name"> | null;
    }
  >;
};

export type CaseSelectOptions = {
  portfolios: Portfolio[];
  taxonomies: Taxonomy[];
  lawyers: Profile[];
  entities: CaseEntity[];
};
