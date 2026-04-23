import { z } from "zod";

export const taxonomySchema = z.object({
  code: z
    .string()
    .min(1, "Informe o codigo.")
    .max(16, "Use ate 16 caracteres.")
    .transform((value) => value.trim().toUpperCase()),
  name: z.string().min(2, "Informe o nome.").max(120, "Use ate 120 caracteres.").transform((value) => value.trim()),
  description: z.string().max(600, "Use ate 600 caracteres.").optional().transform((value) => value?.trim() || null),
  is_active: z.boolean().default(true)
});

export type TaxonomyInput = z.infer<typeof taxonomySchema>;
