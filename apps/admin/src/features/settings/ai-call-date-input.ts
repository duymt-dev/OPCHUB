/** Keep Vietnamese calendar-day boundaries, emitting the UTC form accepted by the API. */
export function serializeAiCallDay(day: string, boundary: 'from' | 'to'): string {
  const time = boundary === 'from' ? '00:00:00' : '23:59:59.999';
  return new Date(`${day}T${time}+07:00`).toISOString();
}
