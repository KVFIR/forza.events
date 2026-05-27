export type CarNameParts = {
  make: string;
  model: string;
};

/** FH6 catalog stores the full in-game name in `model` (usually prefixed with make). */
export function formatCarDisplayName(car: CarNameParts): string {
  const model = car.model.trim();
  const make = car.make.trim();
  if (!make || !model) return model || make;
  if (model.toLowerCase().startsWith(make.toLowerCase())) {
    return model;
  }
  return `${make} ${model}`;
}

export function formatCarEmbedName(car: CarNameParts & {year?: number | null}): string {
  return [car.year, formatCarDisplayName(car)].filter((part) => part != null && part !== '').join(' ');
}
