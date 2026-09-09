import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

function Spinner({
  className,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      aria-label={ariaLabel}
      className={cn("size-4 animate-spin", className)}
      data-slot="spinner"
      role="status"
      {...props}
    />
  );
}

export { Spinner };
