export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}
export interface WeatherHour {
  at: string;
  temperature: number;
  code: number;
  rain: number | null;
  wind: number | null;
}
export function matchWeatherHours(payload: unknown, kickoffAt: string): WeatherHour[] {
  const hourly = (payload as { hourly?: Record<string, unknown> })?.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return [];
  const times = hourly.time;
  const kickoff = Date.parse(kickoffAt);
  if (!Number.isFinite(kickoff)) return [];
  const number = (key: string, index: number) => {
    const series = hourly[key];
    return Array.isArray(series) &&
      series.length === times.length &&
      typeof series[index] === 'number' &&
      Number.isFinite(series[index])
      ? (series[index] as number)
      : null;
  };
  return [0, 1, 2].flatMap((offset): WeatherHour[] => {
    const target = kickoff + offset * 3600000;
    const index = times.findIndex(
      (time) => typeof time === 'number' && Math.abs(time * 1000 - target) <= 1800000,
    );
    if (index < 0) return [];
    const temperature = number('temperature_2m', index),
      code = number('weather_code', index);
    if (temperature === null || code === null) return [];
    return [
      {
        at: new Date(Number(times[index]) * 1000).toISOString(),
        temperature,
        code,
        rain: number('precipitation_probability', index),
        wind: number('wind_gusts_10m', index),
      },
    ];
  });
}
export function weatherLabel(code: number) {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Nuageux';
  if (code <= 48) return 'Brouillard';
  if (code >= 95) return 'Orage';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Neige';
  return 'Pluie';
}
