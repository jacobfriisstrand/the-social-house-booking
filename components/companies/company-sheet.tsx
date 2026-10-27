"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  type CompanyRow,
  companyToAdminValues,
} from "@/lib/domain/company-master-data";
import { CompanyForm } from "./company-form";
import { ResendInvitationButton } from "./resend-invitation-button";

// The company's information in a right-hand sheet (DESIGN.md: admin edit in
// a dialog or a sheet). The sheet opens in place on the list page — no
// dedicated page, no navigation. Content mounts only while open. The row
// click opens it too: pass `open`/`onOpenChange` to control it from
// outside, otherwise it manages its own state (the name-cell trigger).
export function CompanySheet({
  company,
  onClose,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  company: CompanyRow;
  // The row-click wiring's close: the table clears its editing row.
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const onOpenChange = onOpenChangeProp ?? setOpenState;
  const close = useCallback((): void => {
    onOpenChange(false);
    onClose?.();
  }, [onClose, onOpenChange]);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetTrigger
        render={
          <Button
            className="inline-block h-auto max-w-full truncate px-0 py-0 font-medium underline-offset-4 hover:bg-transparent hover:underline"
            type="button"
            variant="ghost"
          />
        }
      >
        {company.company_display_name}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{company.company_display_name}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-8">
          {/* Before the master data is complete the company may still be
              locked out: resendInvitation sends a fresh invite for an unused
              link and Mail 1 with a recovery token once the link is used. A
              completed company is active and manages its own login from
              /settings. */}
          {company.company_master_data_completed_at ? null : (
            <ResendInvitationButton companyId={company.company_id} />
          )}
          <CompanyForm
            defaultValues={companyToAdminValues(company)}
            onSaved={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
