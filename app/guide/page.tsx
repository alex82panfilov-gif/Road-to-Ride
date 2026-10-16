import { VinDone } from "@/components/domain/vin-done";
import { guideSections } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Гайд" };

const hubs = [
  { href: "/guide/glossary", title: "Словарь" },
  { href: "/quiz", title: "Экзамен покупателя" },
  { href: "/method", title: "Как считается оценка" },
  { href: "/changelog", title: "Что изменилось в данных" },
  { href: "/privacy", title: "Что хранится" },
  { href: "/cars", title: "Каталог и чек-листы моделей" },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[2rem] leading-tight font-semibold">Как покупать</h1>
        <p className="mt-2 text-muted">Коротко и без давления. Сайт не выбирает объявление за вас.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {hubs.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="card block p-4 font-medium text-ink no-underline">
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
      {guideSections.map((section) => (
        <section key={section.id} id={section.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {"links" in section && section.links ? (
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {section.id === "vin" ? <VinDone /> : null}
        </section>
      ))}
      <section id="feedback" className="space-y-2">
        <h2 className="text-xl font-semibold">Нашли ошибку в данных?</h2>
        <p>Почта и ссылка на Issues задаются в data/meta.json. Пока поля пустые, правку можно внести прямо в карточку модели и проверить скриптом npm run validate.</p>
      </section>
    </div>
  );
}
