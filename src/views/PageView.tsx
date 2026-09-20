import { Html } from "~/components/Html";
import { MascotCredits } from "~/components/Mascot";
import { ProjectLinks } from "~/components/ProjectLinks";
import { loadPage } from "~/lib/content";
import { strings } from "~/strings";

export function PageView({ page, locale }: { page: string; locale: string }) {
  const html = loadPage(locale, page);
  const t = strings(locale);
  const title =
    page === "about" ? t.pageAbout : page === "dictionary" ? t.pageDictionary : page === "resources" ? t.pageResources : page;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
      <Html className="prose mt-6" html={html} />
      {page === "about" && (
        <>
          <h4 className="mt-6 font-semibold text-sm">{t.avatarStyles}</h4>
          <p className="mt-1 text-muted-foreground text-sm">
            {t.avatarDesc.split("DiceBear")[0]}
            <a className="text-primary underline" href="https://www.dicebear.com">DiceBear</a>
            {t.avatarDesc.split("DiceBear")[1]}
          </p>
          <MascotCredits />
          <ProjectLinks locale={locale} />
        </>
      )}
    </div>
  );
}
