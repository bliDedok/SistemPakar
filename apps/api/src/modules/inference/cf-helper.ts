export function clampCf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function calculateCfExpert(mb: number, md: number): number {
  return clampCf(mb - md);
}

export function calculateCfPartial(cfExpert: number, cfUser: number): number {
  return clampCf(cfExpert) * clampCf(cfUser);
}

export function combineCfValues(values: number[]): number {
  return clampCf(
    values
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((combined, current) => {
        return combined + current * (1 - combined);
      }, 0),
  );
}