// The admin's notices (Opslag, "Beskeder" tab, #12): title, whether the
// notice board shows it, the last day it shows, and the row actions.
import { ActiveToggleButton } from "@/components/forms/active-toggle-button";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { NoticeDialog } from "@/components/notices/notice-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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

function NoticeRow({ row }: { row: NoticeTableRow }) {
  const { lastDay, title } = row.values;
  return (
    <TableRow>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell className="w-32">
        <Badge variant={STATUS_BADGE[row.status]}>
          {copy.status[row.status]}
        </Badge>
      </TableCell>
      <TableCell className="w-40 tabular-nums">
        {lastDay ? formatDateString(lastDay) : copy.noLastDay}
      </TableCell>
      <TableCell className="w-72">
        <div className="flex items-center justify-end gap-2">
          <NoticeDialog initial={row.values} />
          <ActiveToggleButton
            activateLabel={copy.activate}
            deactivateLabel={copy.deactivate}
            id={row.noticeId}
            isActive={row.values.isActive}
            onToggle={setNoticeActive}
            updatedTitle={copy.statusUpdated}
          />
          <ConfirmDeleteButton
            copy={copy}
            id={row.noticeId}
            onDelete={deleteNotice}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function NoticeTable({ rows }: { rows: NoticeTableRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="py-16">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
            <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{copy.columns.title}</TableHead>
            <TableHead className="w-32">{copy.columns.status}</TableHead>
            <TableHead className="w-40">{copy.columns.lastDay}</TableHead>
            <TableHead className="w-72" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <NoticeRow key={row.noticeId} row={row} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
