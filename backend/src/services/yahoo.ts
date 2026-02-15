import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface YahooBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchYahooHistory(
  symbol: string,
  startDate: string
): Promise<YahooBar[]> {
  const results = await yahooFinance.historical(symbol, {
    period1: startDate,
    interval: '1d',
  });

  return results.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}
