export function effectiveRemainingTerm(
  configuredRemainingTerm: number,
  referenceDate: string,
  today = new Date(),
): number {
  const reference = new Date(`${referenceDate}T00:00:00`);
  if (Number.isNaN(reference.getTime())) return Math.max(0, configuredRemainingTerm);

  const elapsedMonths = Math.max(
    0,
    (today.getFullYear() - reference.getFullYear()) * 12 +
      today.getMonth() -
      reference.getMonth() -
      (today.getDate() < reference.getDate() ? 1 : 0),
  );

  return Math.max(0, configuredRemainingTerm - elapsedMonths);
}