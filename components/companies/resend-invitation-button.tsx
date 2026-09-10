"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  type ResendInvitationState,
  resendInvitation,
} from "@/lib/companies/admin-actions";
import { idleFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

export function ResendInvitationButton({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState<ResendInvitationState>(
    resendInvitation.bind(null, companyId),
    idleFormState
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.add({ title: messages.companies.invitationSent, type: "success" });
    }
    if (state.status === "error") {
      toast.add({ title: state.error, type: "error" });
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Button pending={pending} type="submit" variant="outline">
        {pending
          ? messages.companies.resending
          : messages.companies.resendInvitation}
      </Button>
    </form>
  );
}
