import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/features/users/components/accept-invite-form";
import { getCurrentProfile } from "@/features/profiles/queries/get-current-profile";

export default async function CompleteInvitePage() {
  const { user, profile } = await getCurrentProfile();

  if (user && profile) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 premium-grid">
      <AcceptInviteForm />
    </main>
  );
}
