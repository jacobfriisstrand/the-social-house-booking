"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

function Table({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"table"> & { sticky?: boolean }) {
  return (
    <div
      className={cn(
        "relative w-full",
        // A sticky header needs a scrolling ancestor: the capped region
        // scrolls both ways and the header row holds its top. The day
        // grid and the calendar keep the plain horizontal wrapper.
        sticky ? "max-h-[70vh] overflow-auto" : "overflow-x-auto"
      )}
      data-slot="table-container"
    >
      <table
        className={cn(
          "w-full min-w-[40rem] caption-bottom text-sm",
          // The header's bottom line travels with the stuck header: Tailwind's
          // preflight collapses table borders, and a collapsed border is
          // painted at the table's grid position, not the stuck one — and
          // box-shadows on table cells under collapsed borders are not
          // reliably painted either. Each header cell draws its own 1px line
          // as an ::after (the sticky cell is its containing block, so the
          // line travels with it; the cells tile it edge to edge into one
          // continuous line), and the row's own border is dropped to keep
          // the line 1px in both states. The thead sits above the sticky
          // first-column cells (z-10 in the tables' bodies): equal z would
          // let the later tbody paint over the stuck header when both axes
          // scroll.
          sticky &&
            "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead_th]:after:absolute [&_thead_th]:after:inset-x-0 [&_thead_th]:after:bottom-0 [&_thead_th]:after:h-px [&_thead_th]:after:bg-border [&_thead_tr]:border-b-0",
          className
        )}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-muted [&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      data-slot="table-body"
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn(
        "border-t bg-muted font-medium [&>tr]:last:border-b-0",
        className
      )}
      data-slot="table-footer"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted data-[state=selected]:bg-muted",
        className
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "whitespace-nowrap p-2 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      className={cn("m-2 text-muted-foreground text-sm", className)}
      data-slot="table-caption"
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
