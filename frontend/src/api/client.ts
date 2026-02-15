export interface Series {
  id: string;
  source: 'fred' | 'yahoo';
  symbol: string;
  label: string;
  category: string;
  last_fetched_at: string | null;
}

export interface DataPoint {
  date: string;
  value: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export async function getSeries(): Promise<Series[]> {
  const res = await fetch('/api/series');
  if (!res.ok) throw new Error(`Failed to fetch series: ${res.status}`);
  return res.json();
}

export async function getSeriesData(
  id: string,
  from?: string,
  to?: string
): Promise<DataPoint[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.size > 0 ? `?${params}` : '';
  const res = await fetch(`/api/data/${encodeURIComponent(id)}${query}`);
  if (!res.ok) throw new Error(`Failed to fetch data for ${id}: ${res.status}`);
  return res.json();
}
