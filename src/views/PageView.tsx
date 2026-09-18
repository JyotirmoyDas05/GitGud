import { Html } from "~/components/Html";
import { MascotCredits } from "~/components/Mascot";
import { ProjectLinks } from "~/components/ProjectLinks";
import { loadPage } from "~/lib/content";

const TITLES: Record<string, string> = {
  about: "About",
  dictionary: "Dictionary",
  resources: "Resources",
};

export function PageView({ page, locale }: { page: string; locale: string }) {
  const html = loadPage(locale, page);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-semibold text-2xl tracking-tight">{TITLES[page] ?? page}</h1>
      <Html className="prose mt-6" html={html} />
      {page === "about" && (
        <>
          <h4 className="mt-6 font-semibold text-sm">Avatar styles</h4>
          <p className="mt-1 text-muted-foreground text-sm">
            The guide characters are generated with{" "}
            <a className="text-primary underline" href="https://www.dicebear.com">DiceBear</a> (MIT).
            Each style is by a different artist:
          </p>
          <MascotCredits />
          <ProjectLinks />
        </>
      )}
    </div>
  );
}
