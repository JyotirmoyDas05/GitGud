import manifest from "~/mascots.json";
import { cn } from "~/lib/utils";

export interface MascotMeta {
  id: string;
  title: string;
  creator: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const MASCOTS = manifest as MascotMeta[];

/**
 * The guide character for a challenge.
 *
 * Picked by position rather than by hashing the id: hashing clustered badly
 * and gave the same face to four of the eleven challenges. With 21 styles and
 * 11 challenges, indexing guarantees eleven distinct guides — and revisiting a
 * challenge shows the same face, because a character that changes every time
 * you scroll is decoration, not a character.
 *
 * Clicking re-rolls, so anyone who dislikes theirs can change it.
 */
export function mascotAt(index: number, offset = 0): MascotMeta | undefined {
  return MASCOTS[(index + offset) % MASCOTS.length];
}

export function Mascot({
  index,
  offset = 0,
  onCycle,
  className,
}: {
  index: number;
  /** Lifted so the header avatar shows the same face after a re-roll. Keeping
   *  it inside this component let the two drift apart. */
  offset?: number;
  onCycle?: () => void;
  className?: string;
}) {
  const mascot = mascotAt(index, offset);

  if (!mascot) return null;

  return (
    <button
      type="button"
      onClick={onCycle}
      title={`${mascot.title} by ${mascot.creator} — click for a different one`}
      className={cn(
        "shrink-0 cursor-pointer rounded-full border bg-card p-0.5 transition-[box-shadow,scale] hover:border-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
        className,
      )}
    >
      <img
        src={`/mascots/${mascot.id}.svg`}
        alt=""
        aria-hidden="true"
        width={48}
        height={48}
        className="size-12 rounded-full"
      />
    </button>
  );
}

/**
 * Attribution for every style shipped in the pool.
 *
 * Built from the manifest rather than hand-written, so adding a CC BY style
 * to the generator cannot silently ship it uncredited.
 */
export function MascotCredits() {
  const byLicense = new Map<string, MascotMeta[]>();
  for (const m of MASCOTS) {
    const list = byLicense.get(m.license) ?? [];
    list.push(m);
    byLicense.set(m.license, list);
  }

  return (
    <div className="mt-4 space-y-3 text-muted-foreground text-sm">
      {[...byLicense.entries()].map(([license, items]) => (
        <p key={license}>
          <span className="font-medium text-foreground">{license}</span>
          {" — "}
          {[...new Set(items.map((i) => `${i.title} by ${i.creator}`))].join("; ")}.
        </p>
      ))}
    </div>
  );
}
