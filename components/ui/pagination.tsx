// shadcn Pagination (base-nova), owned. Adapted from the registry item:
// the links are buttons instead of anchors — the tables page rows already
// loaded in the browser, so paging is a click, not a navigation. Drawn
// after the "icons only" docs example (2026-09-29): the tables render
// Previous/Next as icon buttons and carry the position in the footer
// summary instead of page numbers. Labels arrive from the caller
// (messages.pagination) — no copy in this file.
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      data-slot="pagination"
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex items-center gap-0.5", className)}
      data-slot="pagination-content"
      {...props}
    />
  );
}

function PaginationItem({ ...props }: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & ComponentProps<typeof Button>;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      aria-current={isActive ? "page" : undefined}
      className={cn(className)}
      data-active={isActive || undefined}
      data-slot="pagination-link"
      render={<button type="button" />}
      size={size}
      variant={isActive ? "outline" : "ghost"}
      {...props}
    />
  );
}

function PaginationPrevious({
  text,
  ...props
}: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink size="icon" {...props}>
      <ChevronLeftIcon data-icon="inline-start" />
      {text ? <span className="hidden sm:block">{text}</span> : null}
    </PaginationLink>
  );
}

function PaginationNext({
  text,
  ...props
}: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink size="icon" {...props}>
      {text ? <span className="hidden sm:block">{text}</span> : null}
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
