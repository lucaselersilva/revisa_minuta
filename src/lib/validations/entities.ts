import { z } from "zod";

export const caseEntityManagementSchema = z.object({
  portfolio_id: z.string().uuid("Selecione a carteira da empresa."),
  name: z.string().trim().min(2, "Informe o nome da empresa."),
  document: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length === 14;
    }, "Informe um CNPJ completo.")
});

export type CaseEntityManagementInput = z.infer<typeof caseEntityManagementSchema>;
