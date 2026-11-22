/** The device's IANA timezone, e.g. "Europe/London". Streaks are computed per user timezone on the server. */
export const deviceTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
