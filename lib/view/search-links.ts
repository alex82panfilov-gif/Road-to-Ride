export type SearchWindow = {
  priceTo?: number;
  yearFrom?: number;
  yearTo?: number;
  kmFrom?: number;
  kmTo?: number;
};

type SearchModel = {
  brand: string;
  model: string;
  autoruPath?: string;
};

function latinSlug(value: string): string {
  return value.toLowerCase().split(/[\s(]/)[0];
}

function autoruTail(model: SearchModel): string {
  return model.autoruPath ?? `${latinSlug(model.brand)}/${latinSlug(model.model)}`;
}

export function autoruSearchUrl(model: SearchModel, query: SearchWindow = {}): string {
  const params = new URLSearchParams();
  params.set("transmission", "AUTOMATIC");
  if (query.yearFrom) params.set("year_from", String(query.yearFrom));
  if (query.yearTo) params.set("year_to", String(query.yearTo));
  if (query.kmFrom) params.set("km_age_from", String(query.kmFrom));
  if (query.kmTo) params.set("km_age_to", String(query.kmTo));
  if (query.priceTo) params.set("price_to", String(query.priceTo));
  return `https://auto.ru/moskva/cars/${autoruTail(model)}/used/?${params.toString()}`;
}

export function dromSearchUrl(model: SearchModel, query: SearchWindow = {}): string {
  const params = new URLSearchParams();
  if (query.yearFrom) params.set("minyear", String(query.yearFrom));
  if (query.yearTo) params.set("maxyear", String(query.yearTo));
  params.set("transmission", "2");
  if (query.kmFrom) params.set("minprobeg", String(query.kmFrom));
  if (query.kmTo) params.set("maxprobeg", String(query.kmTo));
  const price = query.priceTo ? `/do-${query.priceTo}` : "";
  return `https://auto.drom.ru/moscow/${latinSlug(model.brand)}/${latinSlug(model.model)}${price}/?${params.toString()}`;
}

export function similarWindow(year: number, mileageKm: number): SearchWindow {
  const window: SearchWindow = { yearFrom: year - 2, yearTo: year + 2 };
  if (mileageKm > 0) {
    window.kmFrom = Math.round(mileageKm * 0.7);
    window.kmTo = Math.round(mileageKm * 1.3);
  }
  return window;
}
