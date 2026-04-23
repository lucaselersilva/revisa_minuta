import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().email("Informe um e-mail valido.").transform((value) => value.trim().toLowerCase()),
  role: z.enum(["admin", "lawyer"], {
    required_error: "Selecione um perfil."
  })
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const acceptInviteSchema = z
  .object({
    fullName: z.string().min(3, "Informe o nome completo.").max(120, "Nome muito longo."),
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme a senha.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"]
  });

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
