import { meta } from "@/lib/meta";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Что хранится" };

export default function PrivacyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[2rem] leading-tight font-semibold">Что хранится и где</h1>
      <p>Взносы, цель, режим «новичок / знаток» и отметки осмотра лежат в вашем браузере, в localStorage под ключом rtr:v1. Старый ключ fm:v1 переносится сюда при первом открытии. На сервер сайта они не отправляются. Аккаунта в первой версии нет.</p>
      <p>Если очистить данные браузера, копилка пропадёт. Поэтому в копилке есть экспорт и импорт JSON. Раз в месяц сайт напоминает сохранить файл.</p>
      <p>VIN вы вводите только на сайтах Госавтоинспекции, реестра залогов или платного отчёта. Этот сайт номер не спрашивает.</p>
      <p>Аналитика, если сайт открыт на Vercel, — Vercel Web Analytics. Она без cookies и без баннера согласия. Яндекс Метрику мы не ставим.</p>
      <p>Регион цен: {meta.regionLabel}. Дата ориентиров: {meta.updatedAt}.</p>
      <p>{meta.disclaimer}</p>
    </div>
  );
}
