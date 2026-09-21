"use client";

// Long text with a "Læs mere" option (DESIGN.md "Long text"): held to a few
// lines with a soft fade at the cut, and folded out by animating its height.
// A line clamp cannot animate, so the limit is a max-height in line-height
// units (`lh`). The toggle shows only when the text is really cut off, and
// the measurement repeats on resize, since a narrower column cuts off more.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

interface Measurement {
  fullHeight: number;
  overflows: boolean;
}

const unmeasured: Measurement = { fullHeight: 0, overflows: false };

// The text's full height, and whether it exceeds `lines` of the box's own
// line height.
function measure(box: HTMLElement, lines: number): Measurement {
  const lineHeight = Number.parseFloat(getComputedStyle(box).lineHeight);
  const fullHeight = box.scrollHeight;
  return { fullHeight, overflows: fullHeight > lines * lineHeight + 1 };
}

// Measures now and whenever the box changes size. Returns the cleanup.
function watch(
  box: HTMLElement | null,
  lines: number,
  onChange: (measurement: Measurement) => void
): () => void {
  if (!box) {
    return () => undefined;
  }
  const update = () => onChange(measure(box, lines));
  update();
  const observer = new ResizeObserver(update);
  observer.observe(box);
  return () => observer.disconnect();
}

// Folded: the limit in line-height units. Unfolded: the measured height in
// px, so the change between the two can animate.
const maxHeightOf = (
  expanded: boolean,
  fullHeight: number,
  lines: number
): string => (expanded ? `${fullHeight}px` : `calc(${lines} * 1lh)`);

function ReadMoreButton({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      aria-expanded={expanded}
      className="h-auto p-0 text-foreground underline underline-offset-4"
      onClick={onToggle}
      size="sm"
      type="button"
      variant="link"
    >
      {expanded ? messages.common.readLess : messages.common.readMore}
    </Button>
  );
}

interface ExpandableTextProps {
  className?: string;
  lines?: number;
  text: string;
}

export function ExpandableText({
  className,
  lines = 4,
  text,
}: ExpandableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [{ fullHeight, overflows }, setMeasurement] = useState(unmeasured);
  const toggle = useCallback(() => setExpanded((current) => !current), []);

  useEffect(() => watch(ref.current, lines, setMeasurement), [lines]);

  const faded = overflows && !expanded;
  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className={cn(
          "overflow-hidden whitespace-pre-line transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none",
          faded &&
            "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
          className
        )}
        ref={ref}
        style={{ maxHeight: maxHeightOf(expanded, fullHeight, lines) }}
      >
        {text}
      </div>
      {overflows ? (
        <ReadMoreButton expanded={expanded} onToggle={toggle} />
      ) : null}
    </div>
  );
}
