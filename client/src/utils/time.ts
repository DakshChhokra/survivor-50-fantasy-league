const ET_TIMEZONE = 'America/New_York';

function etPartsToDatetimeLocal(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  // Some environments return "24" for midnight; normalize to "00".
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Converts a naive datetime-local string (e.g. "2026-03-05T20:00") entered as
 * Eastern Time into a UTC ISO string for storage.
 *
 * We test both EDT (-04:00) and EST (-05:00) offsets against the requested ET
 * wall-clock value, so conversion is independent of the browser's timezone.
 * For the fall-back repeated hour, we pick EST (the later instant).
 * For nonexistent spring-forward times (e.g. 02:30 ET), we throw.
 */
export function easternToUtc(localDatetimeStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDatetimeStr)) {
    throw new Error('Invalid ET datetime format. Expected YYYY-MM-DDTHH:MM');
  }

  const tryEdt = new Date(`${localDatetimeStr}:00-04:00`);
  const tryEst = new Date(`${localDatetimeStr}:00-05:00`);

  const edtMatches = etPartsToDatetimeLocal(tryEdt) === localDatetimeStr;
  const estMatches = etPartsToDatetimeLocal(tryEst) === localDatetimeStr;

  if (edtMatches && estMatches) return tryEst.toISOString();
  if (edtMatches) return tryEdt.toISOString();
  if (estMatches) return tryEst.toISOString();

  throw new Error('Invalid ET datetime (nonexistent during DST transition)');
}

/**
 * Converts a stored UTC ISO string back to the "YYYY-MM-DDTHH:MM" format that
 * datetime-local inputs expect, expressed in Eastern Time.
 */
export function utcToEasternDatetimeLocal(utcIso: string): string {
  return etPartsToDatetimeLocal(new Date(utcIso));
}

/**
 * Formats a stored UTC ISO deadline as a human-readable Eastern Time string,
 * e.g. "Wed, Mar 5, 8:00 PM EDT".
 */
export function formatEasternDeadline(utcIso: string): string {
  return new Date(utcIso).toLocaleString('en-US', {
    timeZone: ET_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
