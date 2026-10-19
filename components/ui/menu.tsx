"use client";

// Dropdown menu for the row actions (⋯). Base UI Menu like the
// Select/Popover wrappers: composed with render props, and the popup
// shell shares the popover tokens (colour and animation) so the menu
// reads as the same surface as the date picker beside it.
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "cn";

function Menu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />;
}

function MenuTrigger({
  onClick,
  onPointerDown,
  ...props
}: MenuPrimitive.Trigger.Props) {
  // A table row is clickable (the row's sheet), so the ⋯ trigger's press
  // must not reach it — the menu would open AND the row's sheet. Base UI's
  // trigger does not stop the events, and its menu opens on mousedown; stop
  // the press and the click before the row's handlers see them. The menu
  // runs its own open logic from these same events.
  return (
    <MenuPrimitive.Trigger
      data-slot="menu-trigger"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(event);
      }}
      {...props}
    />
  );
}

function MenuContent({
  align = "end",
  className,
  sideOffset = 4,
  ...props
}: MenuPrimitive.Popup.Props & {
  align?: MenuPrimitive.Positioner.Props["align"];
  sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        className="isolate z-50"
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 z-50 min-w-44 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground text-sm shadow-md outline-hidden ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in",
            className
          )}
          data-slot="menu-content"
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      data-slot="menu-item"
      {...props}
    />
  );
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      data-slot="menu-separator"
      {...props}
    />
  );
}

export { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger };
