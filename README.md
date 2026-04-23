# Revisa Minuta CODEX

Fundacao tecnica da plataforma juridica de revisao de pecas processuais assistida por IA para Abrahao Advogados / carteira MaxMilhas.

Esta fase entrega arquitetura, autenticacao, layout base, RLS, taxonomias e gestao inicial de usuarios. Ela nao implementa OCR, IA, parsing documental, cadastro de processos, laudo previo, revisao juridica ou workflow completo.

## Stack

- Next.js 15 com App Router
- TypeScript
- Tailwind CSS
- shadcn/ui como padrao visual
- Supabase Auth, Postgres e Storage
- React Hook Form
- Zod

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Copie as variaveis de ambiente:

```bash
cp .env.example .env.local
```

3. Configure `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
INITIAL_ADMIN_EMAIL=admin@abrahaoadv.com.br
```

4. Execute as migrations no Supabase SQL Editor, nesta ordem:

- `supabase/migrations/202604220001_initial_schema.sql`
- `supabase/migrations/202604220002_rls_policies.sql`
- `supabase/migrations/202604220003_bootstrap_demo.sql`

5. Crie o usuario admin inicial no Supabase:

- Acesse Authentication > Users.
- Crie o usuario `admin@abrahaoadv.com.br` ou o e-mail definido em `INITIAL_ADMIN_EMAIL`.
- Defina uma senha temporaria segura.
- Copie o `User UID`.

6. Vincule o perfil admin:

- Abra `supabase/seed/bootstrap_admin.sql`.
- Substitua `SUBSTITUA_PELO_UUID_DO_AUTH_USER` pelo `User UID`.
- Execute o script no SQL Editor.

7. Rode o projeto:

```bash
npm run dev
```

8. Acesse:

```text
http://localhost:3000/login
```

## Supabase

As tabelas criadas usam prefixo `AA`:

- `AA_offices`
- `AA_profiles`
- `AA_user_invites`
- `AA_taxonomies`
- `AA_audit_logs`

A modelagem ja usa `office_id` para preparar futura expansao multi-tenant. As policies de RLS restringem leitura e escrita ao office do usuario autenticado.

## Rotas desta fase

- `/login`
- `/app`
- `/app/settings/profile`
- `/app/admin/users`
- `/app/admin/taxonomies`

Rotas `/app/admin/*` exigem perfil `admin` em `AA_profiles`.

## Observacoes importantes

- Convites sao registrados em `AA_user_invites`, mas o envio automatico de e-mail ainda nao foi conectado.
- Taxonomias de seed sao apenas demonstrativas e nao representam regra juridica definitiva.
- Mutações administrativas de taxonomias e convites registram eventos em `AA_audit_logs`.
