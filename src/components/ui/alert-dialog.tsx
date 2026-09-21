import type { ComponentProps } from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

import { cn } from "~/lib/utils";

/**
 * After T3 Code's `ui/alert-dialog.tsx` (MIT, © 2026 T3 Tools Inc.), trimmed
 * for a desktop-only window: their version also handles a bottom mobile sheet
 * and stacked/nested dialogs (a settings dialog opening a confirm on top of
 * itself). This app never nests one dialog inside another, so that transform
 * math and the mobile breakpoint are dropped rather than carried unused.
 */
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogBackdrop({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      forceRender
      className={cn(
        "dialog-backdrop fixed inset-0 z-50 transition-all duration-200",
        "data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogPopup({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop />
      <div className="fixed inset-0 z-50 grid grid-rows-[1fr_auto_1fr] justify-items-center p-4">
        <AlertDialogPrimitive.Popup
          className={cn(
            "dialog-glass relative row-start-2 flex min-h-0 w-full max-w-lg min-w-0 flex-col",
            "rounded-2xl border text-popover-foreground outline-none",
            "transition-[scale,opacity] duration-200 ease-in-out",
            "data-ending-style:scale-98 data-ending-style:opacity-0",
            "data-starting-style:scale-98 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </div>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 p-6 pb-4", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 rounded-b-[calc(var(--radius-2xl)-1px)]",
        "border-t bg-muted/72 px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-semibold text-lg leading-none", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function AlertDialogClose(props: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close {...props} />;
}

export {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
};
