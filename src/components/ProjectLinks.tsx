import { Bug, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { COMPANION } from "~/challenges";
import { strings } from "~/strings";
import { Button } from "~/components/ui/button";

const REPO = `https://github.com/${COMPANION.owner}/${COMPANION.repo}`;

/**
 * The two items the Help menu carried that had nowhere else to live.
 *
 * The About page is the natural home: someone looking for the source or a
 * place to report a problem is already looking for information about the app.
 */
export function ProjectLinks({ locale }: { locale: string }) {
  const t = strings(locale);
  const items = [
    { icon: ExternalLink, label: t.projectGithub, url: REPO },
    { icon: Bug, label: t.reportIssue, url: `${REPO}/issues/new` },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map(({ icon: Icon, label, url }) => (
        <Button
          key={label}
          onClick={() => void openUrl(url)}
          variant="outline"
        >
          <Icon className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
