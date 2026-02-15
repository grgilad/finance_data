const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export interface FredObservation {
  date: string;
  value: number | null;
}

export async function fetchFredSeries(
  symbol: string,
  startDate: string
): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', symbol);
  url.searchParams.set('observation_start', startDate);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED API error: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as {
    observations: { date: string; value: string }[];
  };

  return data.observations.map((obs) => ({
    date: obs.date,
    value: obs.value === '.' ? null : parseFloat(obs.value),
  }));
}
