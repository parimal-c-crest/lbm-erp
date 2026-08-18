// Applies a per-tenant offset (ADR-059 staggering) to a job's daily base trigger time, wrapping
// correctly across the hour/day boundary, and renders it as a BullMQ cron pattern.
export function computeStaggeredCronPattern(
  baseHour: number,
  baseMinute: number,
  offsetMinutes: number,
): string {
  const totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;

  return `${minute} ${hour} * * *`;
}
