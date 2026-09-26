// The step row at the top of the booking dialog (DESIGN.md "Booking
// dialog", #81): one numbered circle per step, finished ones ticked, the
// current one in primary, joined by a track that fills as the flow
// advances, and the current step's title under the row. Labels sit beside
// the circles from md up; on phone "Trin 2 af 5" follows the title instead.
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.booking.dialog;

const FORM_STEPS = ["time", "extras", "booker", "overview"] as const;
const ALL_STEPS = [...FORM_STEPS, "confirm"] as const;
type StepKey = (typeof ALL_STEPS)[number];

// Members verify with a code after the form; an admin's booking is
// confirmed at once (ADR-0023), so their row ends at the overview.
const stepKeys = (verifies: boolean): readonly StepKey[] =>
  verifies ? ALL_STEPS : FORM_STEPS;

type StepState = "current" | "done" | "upcoming";

const stepState = (index: number, current: number): StepState => {
  if (index < current) {
    return "done";
  }
  return index === current ? "current" : "upcoming";
};

const circleClasses: Record<StepState, string> = {
  current: "border-primary bg-primary text-primary-foreground",
  done: "border-primary bg-primary text-primary-foreground",
  upcoming: "border-border bg-background text-muted-foreground",
};

const labelClasses: Record<StepState, string> = {
  current: "font-medium text-foreground",
  done: "text-foreground",
  upcoming: "text-muted-foreground",
};

function StepCircle({ index, state }: { index: number; state: StepState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border font-medium text-xs tabular-nums",
        circleClasses[state]
      )}
    >
      {state === "done" ? <CheckIcon className="size-3.5" /> : index + 1}
    </span>
  );
}

// The track to the next step, filled once this step is done. The last
// step has none.
function StepTrack({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-px min-w-4 flex-1 group-last:hidden",
        done ? "bg-primary" : "bg-border"
      )}
    />
  );
}

function Step({
  index,
  label,
  state,
}: {
  index: number;
  label: string;
  state: StepState;
}) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className="group flex not-last:flex-1 items-center gap-2"
    >
      <StepCircle index={index} state={state} />
      <span className={cn("text-xs max-md:sr-only", labelClasses[state])}>
        {label}
      </span>
      <StepTrack done={state === "done"} />
    </li>
  );
}

export function BookingSteps({
  current,
  verifies,
}: {
  current: number;
  verifies: boolean;
}) {
  const keys = stepKeys(verifies);
  return (
    <div className="flex flex-col gap-3">
      <ol aria-label={copy.stepsLabel} className="flex items-center gap-2">
        {keys.map((key, index) => (
          <Step
            index={index}
            key={key}
            label={copy.steps[key]}
            state={stepState(index, current)}
          />
        ))}
      </ol>
      <div className="flex items-baseline gap-2">
        <h3 className="font-medium text-base">
          {copy.stepTitles[keys[current]]}
        </h3>
        <span className="text-muted-foreground text-xs md:hidden">
          {copy.stepOf(current + 1, keys.length)}
        </span>
      </div>
    </div>
  );
}
