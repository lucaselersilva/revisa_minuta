import { z } from "zod";

export const portfolioSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da carteira.").max(120, "Use ate 120 caracteres."),
  slug: z
    .string()
    .trim()
    .min(2, "Informe o identificador da carteira.")
    .max(80, "Use ate 80 caracteres.")
    .transform((value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    ),
  segment: z.string().trim().max(80, "Use ate 80 caracteres.").optional().transform((value) => value || null),
  description: z.string().trim().max(600, "Use ate 600 caracteres.").optional().transform((value) => value || null),
  is_active: z.boolean().default(true)
});

export type PortfolioInput = z.infer<typeof portfolioSchema>;
