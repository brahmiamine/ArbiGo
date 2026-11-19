import { expect, it } from 'vitest';
import { matchWeatherHours } from '@/domain/weather';
const base = Date.parse('2026-12-01T14:00:00Z') / 1000;
const payload = {
  hourly: {
    time: [base, base + 3600, base + 7200],
    temperature_2m: [10, 11, 12],
    weather_code: [0, 3, 61],
    precipitation_probability: [0, 10, 80],
    wind_gusts_10m: [10, 20, 30],
  },
};
it('selects the match slot in UTC, including an offset kickoff, instead of current weather', () => {
  expect(matchWeatherHours(payload, '2026-12-01T15:00:00+01:00').map((h) => h.temperature)).toEqual(
    [10, 11, 12],
  );
  expect(matchWeatherHours(payload, '2026-12-02T14:00:00Z')).toEqual([]);
});
it('does not invent values for missing, null or misaligned forecast data', () => {
  expect(
    matchWeatherHours(
      { hourly: { ...payload.hourly, temperature_2m: [null, 11] } },
      '2026-12-01T14:00:00Z',
    ),
  ).toEqual([]);
  expect(matchWeatherHours(null, 'invalid')).toEqual([]);
});
