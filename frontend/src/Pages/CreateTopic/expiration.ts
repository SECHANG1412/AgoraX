import type { ExpirationPreset } from './layout/ExpirationSelect';

const EXPIRATION_PRESET_DAYS: Record<Exclude<ExpirationPreset, 'custom'>, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
  '14d': 14,
};

const toDateInputValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

const combineDateTime = (dateValue: string, timeValue: string) => `${dateValue}T${timeValue}`;

const EXPIRATION_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const formatExpirationDateTime = (dateTimeValue: string) => {
  const expirationDate = new Date(dateTimeValue);
  if (Number.isNaN(expirationDate.getTime())) return '';

  return EXPIRATION_DATE_TIME_FORMATTER.format(expirationDate);
};

const getPresetDate = (preset: Exclude<ExpirationPreset, 'custom'>) => {
  const date = new Date();
  date.setDate(date.getDate() + EXPIRATION_PRESET_DAYS[preset]);
  return toDateInputValue(date);
};

export { combineDateTime, formatExpirationDateTime, getPresetDate, toDateInputValue };
