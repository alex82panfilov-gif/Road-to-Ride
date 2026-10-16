import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const note =
  "Стартовый ориентир для запуска каталога, не подсчёт объявлений. Замените снимок по docs/AGENT_PROMPT.md.";

const baseCheck = [
  "Сверить VIN на кузове, в ПТС и на табличке",
  "Проверить ограничения на сайте Госавтоинспекции и в реестре залогов",
  "Посмотреть толщиномером крылья, стойки, крышу и пороги",
  "Завести холодным и прогретым, послушать автомат при переключениях",
  "Проехать 10–15 минут: разгон, торможение, поворот руля до упора",
  "Попросить заказ-наряды по маслу в коробке и по двигателю",
];

function car(partial) {
  const model = {
    fuelLPer100: 8,
    avoid: [],
    ...partial,
    checklist: [...baseCheck, ...(partial.checklist ?? [])],
  };
  model.engines = (model.engines ?? []).map((engine) => ({
    ...engine,
    code: engine.code ?? `${engine.volumeL} л / ${engine.hp} л.с.`,
  }));
  return model;
}

const models = [
  car({
    slug: "hyundai-accent-2",
    aliases: ["accent-2"],
    brand: "Hyundai",
    model: "Accent",
    generation: "II (ТагАЗ)",
    years: [2001, 2012],
    body: "sedan",
    summary: "Самый дешёвый вход в каталог. Машина простая, но возраст и ржавчина важнее цифры пробега.",
    fuelLPer100: 8.2,
    engines: [{ volumeL: 1.5, hp: 102, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП", verdict: "acceptable" }],
    mileage: { goodMax: 140000, okMax: 200000, avoidFrom: 270000 },
    subScores: { reliability: 3.5, safety: 3, ownershipCost: 5, purchaseRisk: 3, liquidity: 3 },
    subScoreNotes: {
      reliability: "Конструкция простая, но машинам уже много лет, и состояние зависит от одного хозяина.",
      safety: "Старые оценки безопасности, подушек часто нет или они только спереди.",
      ownershipCost: "Запчасти недорогие, налог небольшой. Неожиданности приходят от возраста, не от мощности.",
      purchaseRisk: "Много машин с ремонтом кузова и сомнительным пробегом. Нужен толщиномер.",
      liquidity: "Покупают из-за цены, но продать потом можно не сразу.",
    },
    risks: [
      risk("Сквозная ржавчина арок и порогов", "high", "purchase", "Осмотр на подъёмнике и толщиномер по кругу", [20000, 80000], "https://www.drom.ru/catalog/hyundai/accent/"),
      risk("Запущенный автомат без замены масла", "medium", "purchase", "Плавность переключений и цвет масла, если есть щуп", [25000, 70000], "https://www.zr.ru/"),
    ],
    avoid: ["Машины без ПТС на руках", "Следы сварки на стаканах и лонжеронах"],
    checklist: ["Проверить днище и задние арки магнитом: шпаклёвка не магнитится"],
    median: 260000,
    medianMileageKm: 230000,
    medianYear: 2007,
  }),
  car({
    slug: "kia-spectra",
    aliases: ["spectra"],
    brand: "Kia",
    model: "Spectra",
    generation: "I (Ижевск)",
    years: [2004, 2011],
    body: "sedan",
    summary: "Простой седан чуть дороже Акцента. Автомат живучий, если масло меняли, а кузов не гнилой.",
    fuelLPer100: 8.6,
    engines: [{ volumeL: 1.6, hp: 101, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП F4A-EL", verdict: "acceptable" }],
    mileage: { goodMax: 150000, okMax: 210000, avoidFrom: 280000 },
    subScores: { reliability: 4, safety: 4, ownershipCost: 5, purchaseRisk: 3.5, liquidity: 3.5 },
    subScoreNotes: {
      reliability: "Двигатель и 4-ступенчатый автомат предсказуемые, если ремень и масло не пропускали.",
      safety: "Для своих лет нормально, но до современных оценок далеко.",
      ownershipCost: "Обслуживание недорогое. Расход топлива выше, чем у более новых одноклассников.",
      purchaseRisk: "Возраст 15–20 лет: смотрите коррозию и следы такси.",
      liquidity: "Берут как первую машину, но выбор на рынке уже редеет.",
    },
    risks: [
      risk("Коррозия днища и арок", "high", "purchase", "Подъёмник и осмотр скрытых полостей", [15000, 70000], "https://www.drom.ru/catalog/kia/spectra/"),
      risk("Ремень ГРМ с большим пробегом", "medium", "ownership", "Спросить дату замены и посмотреть метки у сервиса", [7000, 15000], "https://www.zr.ru/"),
    ],
    avoid: ["Автомат, который пинается уже на прогретой машине"],
    checklist: ["Уточнить, когда меняли ремень ГРМ и масло в автомате"],
    median: 320000,
    medianMileageKm: 200000,
    medianYear: 2008,
  }),
  car({
    slug: "nissan-almera-classic",
    aliases: ["almera-classic"],
    brand: "Nissan",
    model: "Almera Classic",
    generation: "B10",
    years: [2006, 2013],
    body: "sedan",
    summary: "Первая заметная ступенька каталога. Простой 4-ступенчатый автомат и понятная конструкция.",
    fuelLPer100: 8,
    engines: [{ volumeL: 1.6, hp: 107, fuel: "petrol", timing: "chain", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП RE4F03B", verdict: "recommended" }],
    mileage: { goodMax: 150000, okMax: 220000, avoidFrom: 300000 },
    subScores: { reliability: 5, safety: 4, ownershipCost: 5, purchaseRisk: 4, liquidity: 4 },
    subScoreNotes: {
      reliability: "Цепь и простой автомат прощают больше, чем роботы тех лет. Слабое место — возраст кузова.",
      safety: "Одна-две подушки в типичной машине. Для города терпимо, не эталон.",
      ownershipCost: "Запчасти распространены, налог умеренный.",
      purchaseRisk: "Много машин после такси и с перекрасом. Пробег часто не совпадает с возрастом.",
      liquidity: "Имя знакомое, продать реально, но уже не быстро.",
    },
    risks: [
      risk("Растяжение цепи и шум на холодную", "medium", "purchase", "Послушать секунд 10 после ночной стоянки", [15000, 40000], "https://www.drom.ru/catalog/nissan/almera/"),
      risk("Ржавчина задних арок", "medium", "purchase", "Заглянуть под уплотнитель крышки багажника и в арки", [10000, 40000], "https://www.zr.ru/"),
      risk("Автомат без свежего масла", "medium", "ownership", "Плавный разгон 40–80 км/ч без ударов", [8000, 20000], "https://www.zr.ru/"),
    ],
    avoid: ["Сильные удары при включении D и R"],
    checklist: ["Холодный пуск: цепь не должна долго греметь"],
    median: 350000,
    medianMileageKm: 185000,
    medianYear: 2009,
  }),
  car({
    slug: "chevrolet-lacetti",
    aliases: ["lacetti"],
    brand: "Chevrolet",
    model: "Lacetti",
    generation: "J200",
    years: [2004, 2013],
    body: "sedan",
    summary: "Мягкий седан с обычным автоматом. Хорош, если кузов живой, а ремень ГРМ меняли по сроку.",
    fuelLPer100: 8.8,
    engines: [{ volumeL: 1.6, hp: 109, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП Aisin", verdict: "recommended" }],
    mileage: { goodMax: 150000, okMax: 220000, avoidFrom: 290000 },
    subScores: { reliability: 5, safety: 4.5, ownershipCost: 5.5, purchaseRisk: 4.5, liquidity: 4.5 },
    subScoreNotes: {
      reliability: "Автомат Aisin при замене масла ходит долго. Ремень ГРМ пропускать нельзя.",
      safety: "Крепкий салон для своих лет, но без современных помощников.",
      ownershipCost: "Запчасти дешёвые и есть почти везде.",
      purchaseRisk: "Смотрите заднюю балку и следы ДТП в задней части.",
      liquidity: "Понятная машина, на неё есть спрос в нижней части бюджета.",
    },
    risks: [
      risk("Задние пружины и балка", "medium", "purchase", "Послушать скрипы на неровностях и осмотреть пружины", [8000, 25000], "https://www.drom.ru/catalog/chevrolet/lacetti/"),
      risk("Пропущенный ремень ГРМ", "high", "ownership", "Запись в заказ-наряде не старше 60 тыс. км", [8000, 18000], "https://www.zr.ru/"),
    ],
    avoid: ["Машины с стуком в задней подвеске, который продавец называет нормой"],
    checklist: ["Осмотреть задние пружины: обломки видны без разбора"],
    median: 440000,
    medianMileageKm: 175000,
    medianYear: 2008,
  }),
  car({
    slug: "ford-focus-2",
    aliases: ["focus-2"],
    brand: "Ford",
    model: "Focus",
    generation: "II",
    years: [2005, 2011],
    body: "hatchback",
    summary: "Приятный в ходу хэтчбек. Берите 1.6 с обычным 4-ступенчатым автоматом и живым кузовом.",
    fuelLPer100: 8,
    engines: [
      { volumeL: 1.6, hp: 115, fuel: "petrol", timing: "belt", recommended: true },
      { volumeL: 2, hp: 145, fuel: "petrol", timing: "chain", recommended: false },
    ],
    gearboxes: [{ type: "AT", name: "4АКПП 4F27E", verdict: "recommended" }],
    mileage: { goodMax: 140000, okMax: 200000, avoidFrom: 270000 },
    subScores: { reliability: 5.2, safety: 6.5, ownershipCost: 4.5, purchaseRisk: 4.5, liquidity: 5.5 },
    subScoreNotes: {
      reliability: "Связка 1.6 и 4F27E понятная. Двухлитровые машины дороже в содержании.",
      safety: "Для своего времени Focus II оценивали хорошо, подушек обычно несколько.",
      ownershipCost: "Подвеска и рулевое требуют денег чаще, чем у Логана.",
      purchaseRisk: "Очень много машин после такси и с ремонтом переда. Нужна диагностика.",
      liquidity: "Имя по-прежнему продаёт машину быстрее ровесников.",
    },
    risks: [
      risk("Задняя подвеска и ступицы", "medium", "ownership", "Послушать гул на скорости 60–80 км/ч", [10000, 35000], "https://www.drom.ru/catalog/ford/focus/"),
      risk("Рулевая рейка", "medium", "purchase", "Покачать руль на заведённой машине: люфт и стук", [15000, 40000], "https://www.zr.ru/"),
    ],
    avoid: ["Версии 2.0, если бюджет на обслуживание как у 1.6"],
    checklist: ["Проверить люфт руля и гул задних ступиц на ходу"],
    median: 520000,
    medianMileageKm: 168000,
    medianYear: 2008,
  }),
  car({
    slug: "mitsubishi-lancer-9",
    aliases: ["lancer-9"],
    brand: "Mitsubishi",
    model: "Lancer",
    generation: "IX",
    years: [2003, 2010],
    body: "sedan",
    summary: "Надёжный автомат и простой мотор. Главный враг — ржавчина, а не коробка.",
    fuelLPer100: 8.4,
    engines: [{ volumeL: 1.6, hp: 98, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП INVECS-II", verdict: "recommended" }],
    mileage: { goodMax: 150000, okMax: 220000, avoidFrom: 300000 },
    subScores: { reliability: 6, safety: 5, ownershipCost: 4.5, purchaseRisk: 5, liquidity: 5.5 },
    subScoreNotes: {
      reliability: "Автомат и мотор живучие. Кузов сдаётся раньше агрегатов.",
      safety: "Средний уровень тех лет.",
      ownershipCost: "Запчасти чуть дороже корейской тройки, но предсказуемые.",
      purchaseRisk: "Ищите гнилые арки и пороги. Переваренная машина — частая история.",
      liquidity: "Репутация помогает продать, если кузов честный.",
    },
    risks: [
      risk("Коррозия арок, порогов и стаканов", "critical", "purchase", "Подъёмник, эндоскоп скрытых полостей, магнит", [30000, 120000], "https://www.drom.ru/catalog/mitsubishi/lancer/"),
      risk("Ремень ГРМ", "medium", "ownership", "Срок замены по сервисной книжке или заказ-наряду", [8000, 18000], "https://www.zr.ru/"),
    ],
    avoid: ["Машины, у которых арки уже в пузырях под краской"],
    checklist: ["Открыть багажник и посмотреть нишу запасного колеса на ржавчину"],
    median: 570000,
    medianMileageKm: 190000,
    medianYear: 2007,
  }),
  car({
    slug: "nissan-qashqai-j10",
    aliases: ["qashqai-j10"],
    brand: "Nissan",
    model: "Qashqai",
    generation: "J10",
    years: [2006, 2013],
    body: "crossover",
    summary: "Единственный кроссовер каталога в этом бюджете. Вариатор терпим только с честной историей масла.",
    fuelLPer100: 9,
    engines: [{ volumeL: 2, hp: 141, fuel: "petrol", timing: "chain", recommended: true }],
    gearboxes: [{ type: "CVT", name: "вариатор JF011E", verdict: "acceptable" }],
    mileage: { goodMax: 120000, okMax: 180000, avoidFrom: 240000 },
    subScores: { reliability: 4.5, safety: 6, ownershipCost: 4.5, purchaseRisk: 4, liquidity: 6 },
    subScoreNotes: {
      reliability: "Вариатор не прощает грязное масло и буксование. Мотор сам по себе спокойный.",
      safety: "Выше седанов тех лет за счёт массы и оснащения.",
      ownershipCost: "Расход и подвеска дороже, чем у седана того же года.",
      purchaseRisk: "Много машин с усталым вариатором. Нужна диагностика именно коробки.",
      liquidity: "Кроссовер в этом бюджете ищут, поэтому продаётся легче седанов.",
    },
    risks: [
      risk("Износ вариатора", "high", "purchase", "Плавный разгон без воя и диагностика у специалиста по JF011E", [40000, 140000], "https://www.drom.ru/catalog/nissan/qashqai/"),
      risk("Ржавчина подрамника", "high", "purchase", "Осмотр снизу, особенно задняя балка и подрамник", [15000, 50000], "https://www.zr.ru/"),
    ],
    avoid: ["Вариатор с воем и запахом гари на щупе", "Машины после бездорожья"],
    checklist: ["Попросить отчёт по вариатору, не только компьютерную диагностику двигателя"],
    median: 630000,
    medianMileageKm: 160000,
    medianYear: 2010,
  }),
  car({
    slug: "skoda-octavia-a5",
    aliases: ["octavia-a5"],
    brand: "Skoda",
    model: "Octavia",
    generation: "A5",
    years: [2004, 2013],
    body: "wagon",
    summary: "Просторный универсал. Берите 1.6 с автоматом Aisin. Робот DSG и турбо 1.8 — другая история расходов.",
    fuelLPer100: 7.6,
    engines: [
      { volumeL: 1.6, hp: 102, fuel: "petrol", timing: "belt", recommended: true },
      { volumeL: 1.8, hp: 152, fuel: "petrol", timing: "chain", recommended: false },
    ],
    gearboxes: [
      { type: "AT", name: "6АКПП Aisin 09G", verdict: "recommended" },
      { type: "DCT", name: "DSG DQ200", verdict: "avoid" },
    ],
    mileage: { goodMax: 140000, okMax: 210000, avoidFrom: 280000 },
    subScores: { reliability: 5.5, safety: 7.5, ownershipCost: 4.5, purchaseRisk: 5, liquidity: 6 },
    subScoreNotes: {
      reliability: "1.6 с Aisin — спокойный выбор. 1.8 TSI и DSG требуют бюджета на ремонт.",
      safety: "Платформа тех лет с нормальным набором подушек.",
      ownershipCost: "Подвеска и электрика дороже, чем у Соляриса.",
      purchaseRisk: "Важно не перепутать автомат и DSG в объявлении.",
      liquidity: "Универсал охотно берут семьи, продаётся уверенно.",
    },
    risks: [
      risk("Робот DSG DQ200", "critical", "purchase", "В объявлении и по VIN отличить DSG от автомата Aisin", [60000, 150000], "https://www.drom.ru/catalog/skoda/octavia/"),
      risk("Расход масла на 1.8 TSI", "high", "ownership", "Уровень масла и дым на перегазовке после трассы", [20000, 90000], "https://www.zr.ru/"),
    ],
    avoid: ["Любая комплектация с DSG DQ200", "1.8 TSI без истории по маслу"],
    checklist: ["По коду коробки понять, что это Aisin, а не робот"],
    median: 660000,
    medianMileageKm: 175000,
    medianYear: 2010,
  }),
  car({
    slug: "ford-focus-3",
    aliases: ["focus-3"],
    brand: "Ford",
    model: "Focus",
    generation: "III",
    years: [2011, 2019],
    body: "hatchback",
    summary: "Свежее Фокуса II, но почти все автоматы здесь — робот PowerShift. Для первой машины это повод искать другую модель.",
    fuelLPer100: 7.4,
    engines: [{ volumeL: 1.6, hp: 125, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [{ type: "DCT", name: "PowerShift 6DCT250", verdict: "avoid" }],
    mileage: { goodMax: 100000, okMax: 160000, avoidFrom: 220000 },
    subScores: { reliability: 3, safety: 7.5, ownershipCost: 5, purchaseRisk: 2.5, liquidity: 6 },
    subScoreNotes: {
      reliability: "Сухой робот PowerShift — главная причина отказов. Мотор 1.6 сам по себе обычный.",
      safety: "Современнее предыдущего Фокуса, оценки выше.",
      ownershipCost: "Пока робот жив, содержание умеренное. Ремонт коробки съедает выгоду.",
      purchaseRisk: "Скрыть толчки робота на коротком тесте легко. Нужна длинная поездка.",
      liquidity: "Машину знают, но грамотный покупатель торгуется именно из-за коробки.",
    },
    risks: [
      risk("Робот PowerShift 6DCT250", "critical", "purchase", "Проехать 20 минут с пробками: рывки с 1 на 2 передачу и запах сцепления", [70000, 160000], "https://www.drom.ru/catalog/ford/focus/"),
      risk("Течи помпы и патрубков 1.6", "medium", "ownership", "Следы антифриза на защите и уровень в бачке", [7000, 20000], "https://www.zr.ru/"),
    ],
    avoid: ["Любой Focus III с роботом PowerShift, если нет полного бюджета на контрактную коробку"],
    checklist: ["Долгая пробка или дворники включены — послушать, не дёргается ли трогание"],
    median: 680000,
    medianMileageKm: 145000,
    medianYear: 2013,
  }),
  car({
    slug: "nissan-almera-g15",
    aliases: ["almera-g15"],
    brand: "Nissan",
    model: "Almera",
    generation: "G15",
    years: [2012, 2018],
    body: "sedan",
    summary: "Большой скачок около 700 тысяч: свежее Альмеры Классик, простой мотор Renault и огромный салон.",
    fuelLPer100: 8.2,
    engines: [{ volumeL: 1.6, hp: 102, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП DP2", verdict: "acceptable" }],
    mileage: { goodMax: 120000, okMax: 180000, avoidFrom: 250000 },
    subScores: { reliability: 7.2, safety: 6.5, ownershipCost: 7.2, purchaseRisk: 6.5, liquidity: 7 },
    subScoreNotes: {
      reliability: "Мотор K4M знакомый и ремонтируемый. Автомат DP2 живёт, если масло меняли и не перегревали.",
      safety: "Базовые подушки есть, но оснащение скромное.",
      ownershipCost: "Один из самых дешёвых в содержании среди машин моложе 2012 года.",
      purchaseRisk: "Часто работала в такси. Ищите следы шашечек, протёртый руль и сервисную историю.",
      liquidity: "Салон большой, спрос стабильный.",
    },
    risks: [
      risk("Рывки автомата DP2", "high", "purchase", "Переключения на прогретой машине в городе, сканер на соленоиды", [20000, 80000], "https://www.drom.ru/catalog/nissan/almera/"),
      risk("Ремень ГРМ", "medium", "ownership", "Замена раз в 60 тыс. км по заказ-наряду", [8000, 16000], "https://www.zr.ru/"),
    ],
    avoid: ["Бывшие такси без замены масла в DP2"],
    checklist: ["Посмотреть износ сиденья водителя и состояние руля: признак большого городского пробега"],
    median: 700000,
    medianMileageKm: 140000,
    medianYear: 2015,
  }),
  car({
    slug: "mazda-3-bl",
    aliases: ["mazda-3"],
    brand: "Mazda",
    model: "3",
    generation: "BL",
    years: [2009, 2013],
    body: "hatchback",
    summary: "Приятнее в управлении, чем одноклассники. Автомат нормальный, кузов и подвеска требуют внимания.",
    fuelLPer100: 7.8,
    engines: [{ volumeL: 1.6, hp: 105, fuel: "petrol", timing: "chain", recommended: true }],
    gearboxes: [{ type: "AT", name: "4АКПП FN4A-EL", verdict: "acceptable" }],
    mileage: { goodMax: 130000, okMax: 190000, avoidFrom: 260000 },
    subScores: { reliability: 6.5, safety: 7, ownershipCost: 5.5, purchaseRisk: 6, liquidity: 6.5 },
    subScoreNotes: {
      reliability: "Цепь и атмосферный мотор спокойные. Автомат любит свежее масло.",
      safety: "Жёсткий кузов и нормальный набор подушек.",
      ownershipCost: "Подвеска и кузовное железо дороже, чем у Рио.",
      purchaseRisk: "Смотрите арки: ржавчина начинается незаметно.",
      liquidity: "Машину любят, продать реально без большого дисконта.",
    },
    risks: [
      risk("Ржавчина задних арок", "medium", "purchase", "Кромка арки и шов под бампером", [15000, 50000], "https://www.drom.ru/catalog/mazda/mazda3/"),
      risk("Стойки и втулки подвески", "low", "ownership", "Стук на лежачих полицейских", [8000, 25000], "https://www.zr.ru/"),
    ],
    avoid: ["Автомат с пробуксовкой при кикдауне"],
    checklist: ["Осмотреть кромки задних арок изнутри"],
    median: 740000,
    medianMileageKm: 155000,
    medianYear: 2011,
  }),
  car({
    slug: "renault-logan-2",
    aliases: ["logan-2"],
    brand: "Renault",
    model: "Logan",
    generation: "II",
    years: [2014, 2022],
    body: "sedan",
    summary: "Дешёвый в содержании седан. Автомат DP2 приемлем, вариатор поздних лет — только со свежим маслом.",
    fuelLPer100: 7.5,
    engines: [{ volumeL: 1.6, hp: 102, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [
      { type: "AT", name: "4АКПП DP2", verdict: "acceptable" },
      { type: "CVT", name: "вариатор JF015E", verdict: "acceptable" },
    ],
    mileage: { goodMax: 120000, okMax: 190000, avoidFrom: 260000 },
    subScores: { reliability: 6.5, safety: 5.5, ownershipCost: 8, purchaseRisk: 6, liquidity: 6 },
    subScoreNotes: {
      reliability: "Мотор простой. Обе коробки требуют обслуживания, но не сюрприз вроде PowerShift.",
      safety: "Базовая безопасность, без излишеств.",
      ownershipCost: "Один из лидеров по дешевизне запчастей и налога.",
      purchaseRisk: "Много бывших такси. Проверяйте пробег по заказ-нарядам.",
      liquidity: "Берут всегда, когда нужна просторная и недорогая машина.",
    },
    risks: [
      risk("Автомат DP2 перегревается в пробках", "medium", "purchase", "Долгая поездка и смотреть, не появляются ли толчки", [20000, 80000], "https://www.drom.ru/catalog/renault/logan/"),
      risk("Слабое ЛКП и сколы", "low", "ownership", "Капот и кромки дверей", [5000, 20000], "https://www.zr.ru/"),
    ],
    avoid: ["Вариатор без единой замены масла"],
    checklist: ["Спросить, DP2 это или вариатор, и когда меняли масло"],
    median: 780000,
    medianMileageKm: 135000,
    medianYear: 2017,
  }),
  car({
    slug: "hyundai-solaris-1",
    aliases: ["solaris-1"],
    brand: "Hyundai",
    model: "Solaris",
    generation: "I",
    years: [2010, 2017],
    body: "sedan",
    summary: "Ориентир «нормальной первой машины». Берите 1.6 с классическим автоматом и подтверждённой заменой масла.",
    fuelLPer100: 7.2,
    engines: [
      { volumeL: 1.4, hp: 107, fuel: "petrol", timing: "chain", recommended: false },
      { volumeL: 1.6, hp: 123, fuel: "petrol", timing: "chain", recommended: true },
    ],
    gearboxes: [
      { type: "AT", name: "4АКПП A4CF1", verdict: "recommended" },
      { type: "AT", name: "6АКПП A6GF1", verdict: "recommended" },
    ],
    mileage: { goodMax: 120000, okMax: 180000, avoidFrom: 240000 },
    subScores: { reliability: 7.5, safety: 7.5, ownershipCost: 7, purchaseRisk: 7, liquidity: 8 },
    subScoreNotes: {
      reliability: "Цепь и автомат A6GF1 предсказуемы, если масло в коробке меняли каждые 40–60 тыс. км.",
      safety: "Есть подушки и ESP на большинстве машин после рестайлинга.",
      ownershipCost: "Запчасти массовые, расход умеренный.",
      purchaseRisk: "Рынок большой, поэтому проще найти экземпляр с историей, но и перекупщиков много.",
      liquidity: "Одна из самых ликвидных машин каталога.",
    },
    risks: [
      risk("Катализатор и расход масла на больших пробегах", "medium", "ownership", "Эндоскопия цилиндров и анализ выхлопа, если мотор ест масло", [15000, 60000], "https://www.drom.ru/catalog/hyundai/solaris/"),
      risk("Стук рулевой рейки", "medium", "purchase", "Переставка на щебёнке и покачивание руля", [15000, 40000], "https://www.zr.ru/"),
      risk("Масло в автомате «на весь срок»", "high", "purchase", "Заказ-наряды. Если замен не было после 60 тыс. км — торг или отказ", [8000, 15000], "https://www.zr.ru/"),
    ],
    avoid: ["Машины без единого ТО по коробке", "Сильный расход масла больше 0,5 л на 1000 км"],
    checklist: ["Узнать, 4 или 6 ступеней, и дату последней замены масла ATF"],
    median: 820000,
    medianMileageKm: 125000,
    medianYear: 2015,
  }),
  car({
    slug: "kia-rio-3",
    aliases: ["rio-3"],
    brand: "Kia",
    model: "Rio",
    generation: "III",
    years: [2011, 2017],
    body: "sedan",
    summary: "Близнец Соляриса по технике. Те же правила: 1.6, классический автомат, живой катализатор.",
    fuelLPer100: 7.2,
    engines: [
      { volumeL: 1.4, hp: 107, fuel: "petrol", timing: "chain", recommended: false },
      { volumeL: 1.6, hp: 123, fuel: "petrol", timing: "chain", recommended: true },
    ],
    gearboxes: [
      { type: "AT", name: "4АКПП A4CF1", verdict: "recommended" },
      { type: "AT", name: "6АКПП A6GF1", verdict: "recommended" },
    ],
    mileage: { goodMax: 120000, okMax: 180000, avoidFrom: 240000 },
    subScores: { reliability: 7.6, safety: 7.5, ownershipCost: 7, purchaseRisk: 7, liquidity: 8 },
    subScoreNotes: {
      reliability: "Та же платформа, что у Solaris I. Разница чаще в салоне и комплектации, не в ресурсе.",
      safety: "Сопоставимо с Солярисом тех лет.",
      ownershipCost: "Обслуживание массовое и предсказуемое.",
      purchaseRisk: "Смотрите дубликаты объявлений и скрученный пробег — модель очень массовая.",
      liquidity: "Продаётся легко почти круглый год.",
    },
    risks: [
      risk("Износ катализатора", "medium", "ownership", "Эндоскопия и отсутствие ошибки по лямбда-зонду", [15000, 60000], "https://www.drom.ru/catalog/kia/rio/"),
      risk("Пыльники и рулевая", "low", "purchase", "Осмотр рейки и наконечников на подъёмнике", [7000, 25000], "https://www.zr.ru/"),
    ],
    avoid: ["Объявления без фото моторного отсека и VIN"],
    checklist: ["Сравнить пробег в объявлении с заказ-нарядами и состоянием руля"],
    median: 840000,
    medianMileageKm: 128000,
    medianYear: 2015,
  }),
  car({
    slug: "volkswagen-polo-sedan",
    aliases: ["polo-sedan", "polo"],
    brand: "Volkswagen",
    model: "Polo",
    generation: "Sedan I",
    years: [2010, 2020],
    body: "sedan",
    summary: "Выгодная точка около 850 тысяч. Берите поздний 1.6 CWVA с автоматом Aisin, не ранний CFNA и не DSG.",
    fuelLPer100: 7,
    engines: [
      { volumeL: 1.6, hp: 105, fuel: "petrol", timing: "chain", recommended: false },
      { volumeL: 1.6, hp: 110, fuel: "petrol", timing: "belt", recommended: true },
    ],
    gearboxes: [
      { type: "AT", name: "6АКПП Aisin 09G", verdict: "recommended" },
      { type: "DCT", name: "DSG DQ200", verdict: "avoid" },
    ],
    mileage: { goodMax: 110000, okMax: 170000, avoidFrom: 230000 },
    subScores: { reliability: 8, safety: 8.5, ownershipCost: 6.5, purchaseRisk: 7.5, liquidity: 8.5 },
    subScoreNotes: {
      reliability: "CWVA с ремнём и Aisin — удачная пара. Ранний CFNA известен расходом масла.",
      safety: "Один из самых спокойных вариантов каталога по защите седоков.",
      ownershipCost: "Чуть дороже Соляриса в обслуживании, но без сюрпризов у рекомендованной версии.",
      purchaseRisk: "Путаница CFNA/CWVA и редкие DSG. Это проверяется по году и коду мотора.",
      liquidity: "Polo sedan уходит быстро, если обслуживание подтверждено.",
    },
    risks: [
      risk("Расход масла мотора CFNA", "high", "purchase", "Код двигателя и уровень масла. CFNA — до рестайлинга, CWVA предпочтительнее", [20000, 80000], "https://www.drom.ru/catalog/volkswagen/polo/"),
      risk("DSG вместо автомата", "critical", "purchase", "Селектор и код коробки. Нужен Aisin 09G", [60000, 150000], "https://www.zr.ru/"),
    ],
    avoid: ["DSG DQ200", "CFNA с расходом масла без ремонта поршневой"],
    checklist: ["Сфотографировать шильду мотора: CWVA предпочтительнее CFNA"],
    median: 850000,
    medianMileageKm: 112000,
    medianYear: 2017,
  }),
  car({
    slug: "kia-ceed-2",
    aliases: ["ceed-2"],
    brand: "Kia",
    model: "Ceed",
    generation: "II",
    years: [2012, 2018],
    body: "hatchback",
    summary: "Собраннее Рио и чуть дороже в содержании. Классический автомат A6GF1 — нормальный выбор.",
    fuelLPer100: 7.4,
    engines: [{ volumeL: 1.6, hp: 129, fuel: "petrol", timing: "chain", recommended: true }],
    gearboxes: [{ type: "AT", name: "6АКПП A6GF1", verdict: "recommended" }],
    mileage: { goodMax: 120000, okMax: 180000, avoidFrom: 240000 },
    subScores: { reliability: 7.6, safety: 8, ownershipCost: 6.5, purchaseRisk: 7, liquidity: 7.5 },
    subScoreNotes: {
      reliability: "Близко к Рио, подвеска плотнее и рассчитана на более активную езду.",
      safety: "Оснащение богаче базового Рио.",
      ownershipCost: "Запчасти чуть дороже, расход сопоставим.",
      purchaseRisk: "Меньше такси, чем у Рио, но катализатор тот же вопрос на больших пробегах.",
      liquidity: "Хэтчбек берут чуть дольше седана, но цена держится.",
    },
    risks: [
      risk("Катализатор на пробеге за 150 тыс. км", "medium", "ownership", "Эндоскопия, если есть расход масла или ошибка", [15000, 55000], "https://www.drom.ru/catalog/kia/ceed/"),
      risk("Стойки стабилизатора", "low", "ownership", "Стук на мелких неровностях", [4000, 12000], "https://www.zr.ru/"),
    ],
    avoid: ["Редкие дизели и роботы, если попадутся в объявлении"],
    checklist: ["Проверить, что коробка именно 6АКПП, не робот"],
    median: 930000,
    medianMileageKm: 130000,
    medianYear: 2015,
  }),
  car({
    slug: "lada-vesta",
    aliases: ["vesta"],
    brand: "Lada",
    model: "Vesta",
    generation: "I",
    years: [2015, 2022],
    body: "sedan",
    summary: "Своя, с недорогим содержанием. Робот АМТ лучше обходить, вариатор — только с историей масла.",
    fuelLPer100: 7.8,
    engines: [{ volumeL: 1.6, hp: 113, fuel: "petrol", timing: "belt", recommended: true }],
    gearboxes: [
      { type: "AMT", name: "робот АМТ", verdict: "avoid" },
      { type: "CVT", name: "вариатор JF015E", verdict: "acceptable" },
    ],
    mileage: { goodMax: 100000, okMax: 160000, avoidFrom: 220000 },
    subScores: { reliability: 6, safety: 6, ownershipCost: 8, purchaseRisk: 5.5, liquidity: 7 },
    subScoreNotes: {
      reliability: "Мотор простой. Робот АМТ дёргается и надоедает, вариатор требует дисциплины.",
      safety: "Современнее старых седанов, но без запаса дорогих комплектаций.",
      ownershipCost: "Запчасти и налог — сильная сторона.",
      purchaseRisk: "Много машин из такси и каршеринга. Кузов и салон расскажут больше объявления.",
      liquidity: "В России продаётся легко.",
    },
    risks: [
      risk("Робот АМТ", "high", "purchase", "Трогание в горку и переключения в городе: рывки — повод отказаться", [30000, 70000], "https://www.drom.ru/catalog/lada/vesta/"),
      risk("Вариатор без масла", "high", "ownership", "Заказ-наряды на ATF. Нет замен — заложите ремонт", [40000, 130000], "https://www.zr.ru/"),
    ],
    avoid: ["АМТ, если можете доплатить до вариатора с историей или до Polo с Aisin"],
    checklist: ["По шильдику отличить АМТ от вариатора до осмотра"],
    median: 960000,
    medianMileageKm: 110000,
    medianYear: 2019,
  }),
  car({
    slug: "toyota-corolla-e150",
    aliases: ["corolla-e150"],
    brand: "Toyota",
    model: "Corolla",
    generation: "E150",
    years: [2006, 2013],
    body: "sedan",
    summary: "Машина-цель верхней части каталога. Дороже ровесников, потому что мотор 1ZR и репутация держат цену.",
    fuelLPer100: 7.1,
    engines: [{ volumeL: 1.6, hp: 124, fuel: "petrol", timing: "chain", recommended: true }],
    gearboxes: [{ type: "CVT", name: "вариатор K311", verdict: "acceptable" }],
    mileage: { goodMax: 140000, okMax: 200000, avoidFrom: 270000 },
    subScores: { reliability: 9, safety: 8.5, ownershipCost: 6, purchaseRisk: 8, liquidity: 8.5 },
    subScoreNotes: {
      reliability: "1ZR с цепью — один из самых спокойных моторов каталога. Вариатор живёт при замене жидкости.",
      safety: "Крепкий кузов, подушек достаточно для своих лет.",
      ownershipCost: "Запчасти дороже Соляриса, зато реже нужны срочно.",
      purchaseRisk: "Цена высокая, поэтому приманки тоже дорогие. Сверяйте обслуживание вариатора.",
      liquidity: "Имя Toyota продаёт машину даже с честным пробегом.",
    },
    risks: [
      risk("Вариатор без замены жидкости", "high", "purchase", "Заказ-наряды. Вой при наборе скорости — отказ", [40000, 150000], "https://www.drom.ru/catalog/toyota/corolla/"),
      risk("Возраст кузова", "low", "purchase", "Арки и днище, несмотря на репутацию марки", [10000, 40000], "https://www.zr.ru/"),
    ],
    avoid: ["Вариатор с воем", "Цена сильно ниже ориентира без внятной причины"],
    checklist: ["Найти в истории замену жидкости вариатора"],
    median: 990000,
    medianMileageKm: 165000,
    medianYear: 2010,
  }),
];

function risk(title, severity, stage, howToCheck, repairCostRub, source) {
  return { title, severity, stage, howToCheck, repairCostRub, sources: [source, "https://www.zr.ru/"] };
}

function roundThousands(value) {
  return Math.round(value / 1000) * 1000;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const keepCards = new Set([
  "ford-focus-3",
  "mitsubishi-lancer-10",
  "daewoo-matiz",
  "hyundai-elantra-xd",
  "nissan-almera-n16",
  "kia-cerato-1",
  "renault-megane-2",
  "ford-fusion",
  "opel-astra-h",
  "hyundai-solaris-1",
  "kia-rio-3",
  "volkswagen-polo-sedan",
  "nissan-qashqai-j10",
  "chevrolet-lacetti",
]);

const modelDir = path.join(root, "data", "models");
const snapshotDir = path.join(root, "data", "snapshots");
const stashedModels = new Map();
if (fs.existsSync(modelDir)) {
  for (const slug of keepCards) {
    const file = path.join(modelDir, `${slug}.json`);
    if (fs.existsSync(file)) stashedModels.set(slug, fs.readFileSync(file, "utf8"));
  }
}
const knownSlugs = new Set(models.map((item) => item.slug));
const extraSnapshots = new Map();
if (fs.existsSync(snapshotDir)) {
  for (const name of fs.readdirSync(snapshotDir)) {
    if (!/^\d{4}-\d{2}\.json$/.test(name)) continue;
    const data = JSON.parse(fs.readFileSync(path.join(snapshotDir, name), "utf8"));
    const extra = (data.snapshots ?? []).filter((snapshot) => !knownSlugs.has(snapshot.slug));
    if (extra.length) extraSnapshots.set(name.slice(0, 7), extra);
  }
}

fs.rmSync(modelDir, { recursive: true, force: true });
fs.mkdirSync(modelDir, { recursive: true });

for (const item of models) {
  const { median, medianMileageKm, medianYear, ...model } = item;
  if (keepCards.has(model.slug)) continue;
  writeJson(path.join(modelDir, `${model.slug}.json`), model);
}
for (const [slug, raw] of stashedModels) {
  fs.writeFileSync(path.join(modelDir, `${slug}.json`), raw.endsWith("\n") ? raw : `${raw}\n`);
}

const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
fs.rmSync(snapshotDir, { recursive: true, force: true });

for (const [index, month] of months.entries()) {
  const snapshots = [...extraSnapshots.get(month) ?? [], ...models.map((item) => {
    const median = roundThousands(item.median * Math.pow(1.007, index - (months.length - 1)));
    return {
      month,
      slug: item.slug,
      region: "moscow",
      sampleSize: 0,
      p25: roundThousands(median * 0.9),
      median,
      p75: roundThousands(median * 1.12),
      medianMileageKm: item.medianMileageKm,
      medianYear: item.medianYear,
      confidence: "low",
      sources: ["https://www.autostat.ru/"],
      notes: note,
    };
  })];
  writeJson(path.join(snapshotDir, `${month}.json`), {
    schemaVersion: 2,
    seed: true,
    month,
    generatedAt: `${month}-01T09:00:00.000Z`,
    marketSummary: {
      trend:
        month === "2026-10"
          ? "Стартовый ряд заложен с ростом около 0,7% в месяц от мая к октябрю. Это не замер рынка, а каркас, чтобы графики и уровни уже работали."
          : "Промежуточная точка стартового ряда. Не использовать как рыночный факт.",
      sources: ["https://www.autostat.ru/"],
    },
    snapshots,
    newModels: [],
    flags:
      month === "2026-10"
        ? [{ slug: "*", issue: "Все медианы — стартовые ориентиры с confidence=low. Замените живым снимком." }]
        : [],
    changelog:
      month === "2026-10"
        ? "Октябрь 2026. В каталоге 18 моделей с автоматом от Accent до Corolla. Цены — стартовые ориентиры по Москве, уверенность низкая, выборки объявлений нет. Уровни 350, 700 и 850 тысяч заложены как заметные скачки оценки. Перед публичным запуском замените data/snapshots/2026-10.json снимком по методике."
        : "Служебная точка стартового ряда цен.",
  });
}

const weights = { reliability: 0.3, purchaseRisk: 0.2, ownershipCost: 0.2, safety: 0.15, liquidity: 0.15 };
function score(sub) {
  const total = Object.entries(weights).reduce((acc, [key, weight]) => acc + sub[key] * weight, 0);
  return Math.round(total * 10) / 10;
}

console.log("models", models.length);
for (const amount of [150000, 300000, 350000, 500000, 650000, 700000, 800000, 850000, 1000000]) {
  const best = models
    .filter((item) => item.median <= amount)
    .map((item) => ({ name: item.slug, score: score(item.subScores), median: item.median }))
    .sort((a, b) => b.score - a.score)[0];
  console.log(amount, best ? `${best.score} ${best.name}` : "—");
}
