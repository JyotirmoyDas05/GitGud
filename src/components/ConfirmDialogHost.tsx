import { useSyncExternalStore } from "react";

import {
  readConfirmDialogState,
  readIdleConfirmDialogState,
  respondToConfirmDialog,
  subscribeConfirmDialog,
} from "~/lib/confirmDialog";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

/**
 * The single themed confirm surface for the whole app — mounted once, at the
 * root, so `requestConfirmDialog` has somewhere to render regardless of which
 * component called it. See `lib/confirmDialog.ts` for why this is a plain
 * store rather than T3 Code's full multi-host queue.
 */
export function ConfirmDialogHost() {
  const state = useSyncExternalStore(
    subscribeConfirmDialog,
    readConfirmDialogState,
    readIdleConfirmDialogState,
  );

  return (
    <AlertDialog
      open={state.status === "confirming"}
      onOpenChange={(open) => {
        if (!open) respondToConfirmDialog(false);
      }}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.status === "confirming" ? state.title : ""}</AlertDialogTitle>
          {state.status === "confirming" && state.description && (
            <AlertDialogDescription className="whitespace-pre-line">
              {state.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
          <Button
            variant={state.status === "confirming" && state.variant === "destructive" ? "destructive" : "default"}
            onClick={() => respondToConfirmDialog(true)}
          >
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
