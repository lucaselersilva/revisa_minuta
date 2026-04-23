import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const next = url.searchParams.get("next") ?? "/app";
  const typeParam = url.searchParams.get("type");
  const type = typeParam && allowedTypes.has(typeParam as EmailOtpType) ? (typeParam as EmailOtpType) : null;
  const redirectPath = next.startsWith("/") ? next : "/app";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash
    });

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invite_invalid", url.origin));
}
