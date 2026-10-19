"use client";

// The admin's notices (Opslag, "Beskeder" tab, #12): title, whether the
// notice board shows it, the last day it shows, and the row's ⋯ menu —
// the edit sheet, the visibility toggle and the confirm-guarded delete,
// the bookings list's pattern.

import {
  BanIcon,
  CircleCheckIcon,
  EllipsisIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback } from "react";
import { EmptyCard } from "@/components/empty-card";
import { useActiveToggleAction } from "@/components/forms/active-toggle-button";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { openRowWith } from "@/components/forms/open-row-with";
import { useMenuDialogs } from "@/components/forms/use-menu-dialogs";
import { NoticeSheet } from "@/components/notices/notice-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NoticeStatus } from "@/lib/domain/notice";
import { formatDateString } from "@/lib/format";
import { deleteNotice, setNoticeActive } from "@/lib/notices/actions";
import type { NoticeFormValues } from "@/lib/validation/notices";
import { messages } from "@/messages/da";

const copy = messages.notices;

export interface NoticeTableRow {
  noticeId: string;
  status: NoticeStatus;
  values: NoticeFormValues;
}

const STATUS_BADGE = {
  ended: "outline",
  off: "outline",
  shown: "success",
} as const;

// One row's ⋯ menu: the edit sheet, the reversible visibility toggle and
// the delete, which opens the confirm dialog (DESIGN.md "Confirm before
// destroying").
function NoticeRowMenu({
  onDelete,
  onEdit,
  row,
}: {
  onDelete: (row: NoticeTableRow) => void;
  onEdit: (row: NoticeTableRow) => void;
  row: NoticeTableRow;
}) {
  const { pending, run } = useActiveToggleAction(
    setNoticeActive,
    copy.statusUpdated
  );
  const openDelete = useCallback(() => onDelete(row), [onDelete, row]);
  const openEdit = useCallback(() => onEdit(row), [onEdit, row]);
  const toggle = useCallback(
    () => run(row.noticeId, !row.values.isActive),
    [row, run]
  );

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label={copy.actions.open(row.values.title)}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={openEdit}>
          <PencilIcon aria-hidden="true" />
          {copy.editLabel}
        </MenuItem>
        <MenuItem disabled={pending} onClick={toggle}>
          {row.values.isActive ? (
            <BanIcon aria-hidden="true" />
          ) : (
            <CircleCheckIcon aria-hidden="true" />
          )}
          {row.values.isActive ? copy.deactivate : copy.activate}
        </MenuItem>
        <MenuItem
          className="text-destructive data-[highlighted]:text-destructive"
          onClick={openDelete}
        >
          <Trash2Icon aria-hidden="true" />
          {copy.delete}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function NoticeRow({
  onDelete,
  onEdit,
  row,
}: {
  onDelete: (row: NoticeTableRow) => void;
  onEdit: (row: NoticeTableRow) => void;
  row: NoticeTableRow;
}) {
  const { lastDay, title } = row.values;
  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      {...openRowWith(row, onEdit)}
    >
      <TableCell className="truncate font-medium">{title}</TableCell>
      <TableCell>
        <Badge variant={STATUS_BADGE[row.status]}>
          {copy.status[row.status]}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums">
        {lastDay ? formatDateString(lastDay) : copy.noLastDay}
      </TableCell>
      <TableCell className="w-14">
        <NoticeRowMenu onDelete={onDelete} onEdit={onEdit} row={row} />
      </TableCell>
    </TableRow>
  );
}

// The row menu's sheets: the controlled edit sheet and the
// confirm-guarded delete, opened from the ⋯ menu, mounted beside the
// table card.
function NoticeDialogs({
  closeDelete,
  closeEditor,
  deleting,
  editing,
}: {
  closeDelete: (open: boolean) => void;
  closeEditor: (open: boolean) => void;
  deleting: NoticeTableRow | null;
  editing: NoticeTableRow | null;
}) {
  return (
    <>
      <NoticeSheet
        initial={editing?.values ?? null}
        onOpenChange={closeEditor}
        open={editing !== null}
      />
      {deleting ? (
        <ConfirmDeleteButton
          copy={copy}
          id={deleting.noticeId}
          onDelete={deleteNotice}
          onOpenChange={closeDelete}
          open
        />
      ) : null}
    </>
  );
}

export function NoticeTable({ rows }: { rows: NoticeTableRow[] }) {
  // The row menu's picks, shared hook: the sheet and the confirm dialog
  // are mounted once, opened from the ⋯ menu.
  const {
    closeDelete,
    closeEditor,
    deleting,
    editing,
    setDeleting,
    setEditing,
  } = useMenuDialogs<NoticeTableRow>();

  if (rows.length === 0) {
    return (
      <EmptyCard description={copy.emptyDescription} title={copy.emptyTitle} />
    );
  }
  return (
    <>
      <Card className="py-0">
        <Table className="min-w-[52rem] table-fixed" sticky>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.columns.title}</TableHead>
              <TableHead>{copy.columns.status}</TableHead>
              <TableHead>{copy.columns.lastDay}</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <NoticeRow
                key={row.noticeId}
                onDelete={setDeleting}
                onEdit={setEditing}
                row={row}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
      <NoticeDialogs
        closeDelete={closeDelete}
        closeEditor={closeEditor}
        deleting={deleting}
        editing={editing}
      />
    </>
  );
}
