"use client";

import { Dialog as OverlayPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

function Overlay({ className, ...props }: OverlayPrimitive.Backdrop.Props) {
  return (
    <OverlayPrimitive.Backdrop
      className={cn(
        "data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-200 ease-out data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs motion-reduce:data-closed:animate-none motion-reduce:data-open:animate-none",
        className
      )}
      data-slot="overlay"
      {...props}
    />
  );
}

export { Overlay };
