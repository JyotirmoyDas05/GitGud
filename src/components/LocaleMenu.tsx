import { Menu } from "@base-ui/react/menu";
import { Check, Globe } from "lucide-react";

import { LOCALES } from "~/lib/content";
import { cn } from "~/lib/utils";

/**
 * Language picker.
 *
 * A native `<select>` renders the OS dropdown — square, unthemed, and
 * obviously a browser control sitting inside a desktop app. This is a real
 * popup: rounded, glass, separated, with a tick on the current choice.
 *
 * The motion follows Emil Kowalski's practical tips: it scales from 0.96
 * rather than 0 (#2), eases out (#4), scales from the trigger corner via
 * `--transform-origin` (#5), and finishes in 140ms (#6).
 */
export function LocaleMenu({
  locale,
  locales,
  onChange,
}: {
  locale: string;
  locales: string[];
  onChange: (next: string) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--control-radius)]",
          "border border-input bg-popover px-2.5 text-sm shadow-xs outline-none",
          "transition-[background-color,box-shadow] hover:bg-accent/50",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "data-[popup-open]:bg-accent/50 dark:bg-input/32 dark:hover:bg-input/50",
        )}
      >
        <Globe className="size-3.5 text-muted-foreground" />
        {LOCALES[locale] ?? locale}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50 outline-none">
          <Menu.Popup
            className={cn(
              "panel-glass min-w-44 origin-[var(--transform-origin)] rounded-xl border p-1",
              "outline-none",
              // `scale`, not `transform`: Tailwind v4 writes `scale-*` as the
              // standalone `scale` property. Naming `transform` here left the
              // scale untransitioned, so the popup snapped to 96% on close
              // and only the opacity faded — the "jerk".
              "transition-[scale,opacity,filter] duration-140 ease-out-strong",
              "data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0",
              "data-[starting-style]:blur-[2px]",
              // Exit is the system responding, so it is quicker than the entry.
              "data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0",
              "data-[ending-style]:blur-[2px] data-[ending-style]:duration-100",
            )}
          >
            <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
              Language
            </div>
            <Menu.Separator className="-mx-1 my-1 h-px bg-border" />

            {locales.map((code) => (
              <Menu.Item
                key={code}
                onClick={() => onChange(code)}
                className={cn(
                  "flex cursor-pointer select-none items-center justify-between gap-3",
                  "rounded-md px-2 py-1.5 text-sm outline-none",
                  "data-[highlighted]:bg-accent data-[highlighted]:text-foreground",
                  code === locale ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {LOCALES[code] ?? code}
                {code === locale && <Check className="size-3.5 text-primary" />}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
