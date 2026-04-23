import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().email("Informe um e-mail valido.").transform((value) => value.trim().toLowerCase()),
  role: z.enum(["admin", "lawyer"], {
    required_error: "Selecione um perfil."
  })
});

export type InviteInput = z.infer<typeof inviteSchema>;
