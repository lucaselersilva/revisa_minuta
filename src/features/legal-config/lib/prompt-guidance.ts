import type { PortfolioPromptProfile, PromptAnalysisType } from "@/types/database";

type PortfolioStaticGuidance = {
  strategyKey: string;
  strategyLabel: string;
  focusAreas: string[];
  cautionPoints: string[];
  outputEmphasis: string[];
};

function toBulletList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getPortfolioStaticGuidance({
  portfolioSlug,
  portfolioSegment,
  analysisType
}: {
  portfolioSlug: string | null | undefined;
  portfolioSegment: string | null | undefined;
  analysisType: PromptAnalysisType;
}): PortfolioStaticGuidance {
  const slug = (portfolioSlug ?? "").trim().toLowerCase();
  const segment = (portfolioSegment ?? "").trim().toLowerCase();

  if (slug === "banco-bmg" || segment.includes("banc")) {
    if (analysisType === "defense_conformity") {
      return {
        strategyKey: "banking-defense-conformity",
        strategyLabel: "Conformidade defensiva bancaria",
        focusAreas: [
          "cadeia documental da contratacao e do aceite",
          "documentos de liberacao, uso do produto ou historico de descontos",
          "coerencia entre identidade do autor, extratos, margem e contrato",
          "enfrentamento especifico de fraude, nao contratacao, descontos indevidos e dano moral"
        ],
        cautionPoints: [
          "nao tratar fundamentacao abstrata como suficiente sem lastro documental",
          "nao presumir fraude ou regularidade da contratacao sem suporte concreto",
          "nao considerar rebatido um pedido se a contestacao ignorar a cronologia financeira do caso"
        ],
        outputEmphasis: [
          "aderencia contratual",
          "cronologia dos descontos ou da liberacao",
          "nexo entre documentos bancarios e o autor",
          "lacunas materiais da contestacao"
        ]
      };
    }

    return {
      strategyKey: "banking-pre-analysis",
      strategyLabel: "Pre-analise bancaria",
      focusAreas: [
        "trilha de contratacao, aceite e liberacao ou uso do produto",
        "documentos bancarios, extratos, historico de descontos e margem consignavel",
        "coerencia entre identidade, contrato, conta, beneficio e comprovantes",
        "quantificacao dos danos materiais e suporte para dano moral"
      ],
      cautionPoints: [
        "nao presumir fraude, contrato inexistente ou regularidade contratual sem suporte documental",
        "diferenciar consignado, cartao, saque, refinanciamento e desconto indevido quando coexistirem",
        "destacar lacunas de vinculacao subjetiva entre documento bancario e autor"
      ],
      outputEmphasis: [
        "rastreabilidade contratual",
        "cronologia financeira",
        "prova minima de descontos ou liberacao",
        "fragilidades documentais exploraveis pela defesa"
      ]
    };
  }

  if (analysisType === "defense_conformity") {
    return {
      strategyKey: "travel-defense-conformity",
      strategyLabel: "Conformidade defensiva de turismo/intermediacao",
      focusAreas: [
        "cadeia de compra, reserva, voucher, emissao e atendimento",
        "separacao entre intermediadora, fornecedor final e origem da falha alegada",
        "enfrentamento especifico de reembolso, cancelamento, dano moral e despesas alegadas",
        "aderencia da contestacao aos documentos do autor e aos fatos supervenientes"
      ],
      cautionPoints: [
        "nao presumir responsabilidade solidaria automatica da intermediadora",
        "nao considerar ponto enfrentado se a contestacao ignorar detalhe material da reserva, cronologia ou fornecedor",
        "diferenciar falha operacional do fornecedor final e obrigacoes efetivamente assumidas pela carteira"
      ],
      outputEmphasis: [
        "cadeia de fornecimento",
        "cronologia do atendimento",
        "separacao de responsabilidades",
        "pedidos nao integralmente rebatidos"
      ]
    };
  }

  return {
    strategyKey: "travel-pre-analysis",
    strategyLabel: "Pre-analise de turismo/intermediacao",
    focusAreas: [
      "cadeia de compra, reserva, localizadores, vouchers e comprovantes de pagamento",
      "comunicacoes com plataforma, companhia, hotel ou fornecedor final",
      "cronologia da falha alegada, do atendimento e do pedido de reembolso",
      "relacao entre narrativa do autor, documentos e atuacao da intermediadora"
    ],
    cautionPoints: [
      "nao presumir responsabilidade direta da intermediadora sem lastro no caso concreto",
      "diferenciar comprador, passageiro, beneficiario, reclamante e destinatario de eventual estorno",
      "verificar divergencias entre reservas, codigos, datas, trajetos, vouchers e comprovantes"
    ],
    outputEmphasis: [
      "nexo causal",
      "cadeia negocial",
      "suficiencia documental dos pedidos",
      "pontos exploraveis pela defesa"
    ]
  };
}

export function buildPromptProfileContextLines(profile: PortfolioPromptProfile | null) {
  if (!profile) {
    return ["Nenhum perfil administrativo de prompt ativo configurado para este escopo."];
  }

  return [
    `Perfil administrativo ativo: ${profile.profile_name}`,
    ...(profile.instruction_priority ? ["Prioridades configuradas:", ...toBulletList(profile.instruction_priority).map((item) => `- ${item}`)] : []),
    ...(profile.must_check_items ? ["Itens que sempre devem ser verificados:", ...toBulletList(profile.must_check_items).map((item) => `- ${item}`)] : []),
    ...(profile.forbidden_assumptions ? ["Presuncoes vedadas:", ...toBulletList(profile.forbidden_assumptions).map((item) => `- ${item}`)] : []),
    ...(profile.preferred_reasoning_style
      ? ["Estilo de raciocinio preferido:", ...toBulletList(profile.preferred_reasoning_style).map((item) => `- ${item}`)]
      : []),
    ...(profile.output_emphasis ? ["Foco de saida:", ...toBulletList(profile.output_emphasis).map((item) => `- ${item}`)] : []),
    ...(profile.additional_instructions
      ? ["Instrucoes complementares:", ...toBulletList(profile.additional_instructions).map((item) => `- ${item}`)]
      : [])
  ];
}

export function buildPromptTrace({
  analysisType,
  staticGuidance,
  promptProfile,
  requirements,
  theses,
  templateTitles
}: {
  analysisType: PromptAnalysisType;
  staticGuidance: PortfolioStaticGuidance;
  promptProfile: PortfolioPromptProfile | null;
  requirements: Array<{ id: string; requirement_label: string; document_type: string; step_key: string }>;
  theses: Array<{ id: string; title: string }>;
  templateTitles: Array<{ id: string; title: string }>;
}) {
  return {
    analysis_type: analysisType,
    portfolio_strategy: {
      key: staticGuidance.strategyKey,
      label: staticGuidance.strategyLabel,
      focus_areas: staticGuidance.focusAreas,
      caution_points: staticGuidance.cautionPoints,
      output_emphasis: staticGuidance.outputEmphasis
    },
    prompt_profile: promptProfile
      ? {
          id: promptProfile.id,
          profile_name: promptProfile.profile_name,
          taxonomy_scope: promptProfile.taxonomy_id ? "taxonomy" : "portfolio",
          configured_fields: [
            promptProfile.instruction_priority ? "instruction_priority" : null,
            promptProfile.must_check_items ? "must_check_items" : null,
            promptProfile.forbidden_assumptions ? "forbidden_assumptions" : null,
            promptProfile.preferred_reasoning_style ? "preferred_reasoning_style" : null,
            promptProfile.output_emphasis ? "output_emphasis" : null,
            promptProfile.additional_instructions ? "additional_instructions" : null
          ].filter(Boolean),
          highlights: [
            ...toBulletList(promptProfile.instruction_priority).slice(0, 3),
            ...toBulletList(promptProfile.must_check_items).slice(0, 3)
          ].slice(0, 5)
        }
      : null,
    legal_configuration: {
      requirements: requirements.map((item) => ({
        id: item.id,
        label: item.requirement_label,
        document_type: item.document_type,
        step_key: item.step_key
      })),
      theses: theses.map((item) => ({ id: item.id, title: item.title })),
      templates: templateTitles.map((item) => ({ id: item.id, title: item.title }))
    }
  };
}
