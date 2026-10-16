"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type CompanyRow,
  companyToAdminValues,
} from "@/lib/domain/company-master-data";
import { CompanyForm } from "./company-form";
import { ResendInvitationButton } from "./resend-invitation-button";

// The company's information in a right-hand sheet (DESIGN.md: admin edit in
// a dialog or a sheet). The sheet opens in place on the list page — no
// dedicated page, no navigation. Content mounts only while open.
export function CompanySheet({ company }: { company: CompanyRow }) {
  const [open, setOpen] = useState(false);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button
            className="inline-block h-auto max-w-full truncate px-0 py-0 font-medium underline-offset-4 hover:bg-transparent hover:underline"
            type="button"
            variant="ghost"
          />
        }
      >
        {company.company_display_name}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-full gap-0 overflow-y-auto max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{company.company_display_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          {/* Re-inviting is only meaningful before the company has used the
              invite: once its master data is filled in, Auth refuses a new
              invite and the flow is "Glemt adgangskode". */}
          {company.company_master_data_completed_at ? null : (
            <ResendInvitationButton companyId={company.company_id} />
          )}
          <CompanyForm
            defaultValues={companyToAdminValues(company)}
            onSaved={close}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
