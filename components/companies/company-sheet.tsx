"use client";

import { useState } from "react";
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
// dedicated page, no navigation. Content mounts only while open.
export function CompanySheet({ company }: { company: CompanyRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button
            className="h-auto px-0 py-0 font-medium underline-offset-4 hover:bg-transparent hover:underline"
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
          <ResendInvitationButton companyId={company.company_id} />
          <CompanyForm defaultValues={companyToAdminValues(company)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
