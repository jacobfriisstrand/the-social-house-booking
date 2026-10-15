// The DESIGN.md empty state: a white bordered card, py-16, centred, with a
// title line and one sentence.
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function EmptyCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
}
