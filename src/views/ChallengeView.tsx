import { useEffect, useRef, useState } from "react";

import { byId, indexOf } from "~/challenges";
import { Html } from "~/components/Html";
import { Mascot, mascotAt } from "~/components/Mascot";
import { Outline } from "~/components/Outline";
import { PrevNext } from "~/components/Shell";
import { VerifyBlock } from "~/components/VerifyBlock";
import { loadChallenge } from "~/lib/content";
import { useProgress } from "~/lib/progress";
import { navigate } from "~/lib/router";
import { setHeaderTitle } from "~/lib/headerTitle";
import { Button } from "~/components/ui/button";

export function ChallengeView({ id, locale }: { id: string; locale: string }) {
  const challenge = byId(id);
  const index = indexOf(id);
  const { isComplete } = useProgress();
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  if (!challenge) {
    // A stale bookmark or a typed hash should not leave a blank window.
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-semibold text-xl">Challenge not found</h1>
        <Button variant="link" className="mt-4 px-0" onClick={() => navigate({ name: "home" })}>
          Back to all challenges
        </Button>
      </div>
    );
  }

  const body = loadChallenge(locale, challenge.file);
  const done = isComplete(challenge.id);

  return (
    <ChallengeBody
      challenge={challenge}
      index={index}
      done={done}
      body={body}
      locale={locale}
      bodyRef={bodyRef}
      titleRef={titleRef}
    />
  );
}

/**
 * Split out so the hooks below sit above any early return — `challenge` is
 * optional in the parent and React will not accept conditional hooks.
 */
function ChallengeBody({
  challenge,
  index,
  done,
  body,
  locale,
  bodyRef,
  titleRef,
}: {
  challenge: NonNullable<ReturnType<typeof byId>>;
  index: number;
  done: boolean;
  body: ReturnType<typeof loadChallenge>;
  locale: string;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Re-rolling the guide is per-challenge, so moving to the next one starts
  // from that challenge's own face rather than inheriting the last re-roll.
  const [mascotOffset, setMascotOffset] = useState(0);
  useEffect(() => setMascotOffset(0), [challenge.id]);

  const mascotId = mascotAt(index, mascotOffset)?.id;

  // Hand the heading — and the guide that belongs to it — to the title bar
  // once the real one leaves the viewport, and take it back when it returns.
  // Observing the element beats watching scroll offsets: it stays correct
  // regardless of content height, zoom, or where the scroll container is.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeaderTitle(
          entry.isIntersecting
            ? null
            : {
                eyebrow: `Challenge ${index + 1} of 11`,
                title: challenge.title,
                mascotId,
              },
        );
      },
      { rootMargin: "-52px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      setHeaderTitle(null);
    };
  }, [challenge.title, index, mascotId, titleRef]);

  return (
    // The row is centred as a *pair*: content and outline are sized by their
    // own max-widths and the leftover space is split evenly either side.
    // `flex-1` on the content would eat all of it and make `justify-center` a
    // no-op, which is what left the outline stranded mid-window when maximised.
    <div className="mx-auto flex w-full max-w-6xl justify-center gap-6 px-6">
      <div ref={bodyRef} className="w-full min-w-0 max-w-2xl py-8">
      <div ref={titleRef} className="flex items-center gap-3">
        <Mascot
          index={index}
          offset={mascotOffset}
          onCycle={() => setMascotOffset((o) => o + 1)}
        />
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-muted-foreground text-xs tabular-nums">
              Challenge {index + 1} of 11
            </span>
            {done && (
              <span className="rounded-full bg-success-surface px-2 py-0.5 font-medium text-[11px] text-success-foreground">
                Completed
              </span>
            )}
          </div>
          <h1 className="font-semibold text-2xl tracking-tight">{challenge.title}</h1>
        </div>
      </div>

      <Html className="prose mt-6" html={body.before} />

      {/* Sits at the marker's original position — several challenges put tips
          below the button, so appending it would reorder the lesson. */}
      <VerifyBlock challenge={challenge} locale={locale} />

      {body.after && <Html className="prose" html={body.after} />}

      <PrevNext current={index} />
      </div>

      <Outline containerRef={bodyRef} contentKey={challenge?.id ?? ""} />
    </div>
  );
}
