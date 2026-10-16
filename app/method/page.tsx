import { ScoreChart } from "@/components/domain/score-chart";
import { catalog, snapshotFiles } from "@/lib/data";
import { SCORE_WEIGHTS } from "@/lib/score";
import { labels } from "@/lib/content";
import { meta } from "@/lib/meta";
import { tierLadder } from "@/lib/market";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Как считается" };

const rows = [
  ["Надёжность", "30%", "Как часто эта связка мотора и коробки доезжает без дорогого ремонта"],
  ["Спокойствие покупки", "20%", "Насколько легко нарваться на такси, скрытый ремонт или плохую коробку"],
  ["Стоимость владения", "20%", "Налог, топливо, запчасти. Выше балл — дешевле содержать"],
  ["Безопасность", "15%", "Запас по кузову и оснащению для своих лет"],
  ["Ликвидность", "15%", "Как просто потом продать"],
];

export default function MethodPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-semibold">Как считается оценка</h1>
      <p>
        Итог считает код, не человек и не агент, который обновляет карточки. Веса зафиксированы: надёжность {SCORE_WEIGHTS.reliability}, спокойствие покупки {SCORE_WEIGHTS.purchaseRisk}, стоимость владения {SCORE_WEIGHTS.ownershipCost}, безопасность {SCORE_WEIGHTS.safety}, ликвидность {SCORE_WEIGHTS.liquidity}. Все пять чисел от 0 до 10, и больше — лучше.
      </p>
      <table className="site-table">
        <caption className="sr-only">Веса критериев оценки</caption>
        <thead>
          <tr>
            <th scope="col">Критерий</th>
            <th scope="col">Вес</th>
            <th scope="col">Смысл</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>Оценка уровня — лучшая модель, медиана которой не выше бюджета. Выгодные точки на графике — суммы, где эта оценка заметно прыгает. Сейчас это {meta.sweetSpots.map((amount) => amount.toLocaleString("ru-RU")).join(", ")} ₽.</p>
      <ScoreChart steps={tierLadder(catalog)} marks={meta.sweetSpots} />
      <p>
        Цены берутся из месячного снимка по {meta.regionLabel}. У каждой есть p25, медиана, p75, пробег, год и уверенность. Если объявлений меньше восьми, уверенность может быть только «мало данных». Стартовый каталог честно стоит в этом режиме: цифры — каркас, их заменяют по docs/AGENT_PROMPT.md.
      </p>
      <p>Последний снимок: {snapshotFiles.at(-1)?.month}. {labels.confidence.low} означает, что на число нельзя опираться как на статистику площадки.</p>
      <h2 className="text-lg font-semibold">Проверка пробега в объявлении</h2>
      <p>
        Пробег сравнивается с возрастом в обе стороны. Ожидание — 15 тыс. км в год. Если машине 8 лет и больше, а пробег меньше половины этой нормы, сайт пишет, что пробег подозрительно мал, и просит сверить историю по VIN. Четыре и больше владельцев при таком пробеге усиливают пометку: каждая смена владельца — повод для скрутки. От половины до 1,3 нормы пробег обычный для возраста. Выше 1,3 нормы или 30 тыс. км в год — похоже на такси или каршеринг. Выше порога модели объявление лучше не рассматривать. У машины от 15 лет отдельно сказано, что резина, сальники, проводка и печка стареют независимо от пробега.
      </p>
      <p>{meta.disclaimer}</p>
    </div>
  );
}
