import { LineChart, Sparkline } from '@mantine/charts';
import type { DataPoint } from '../api/client';

interface ChartProps {
  data: DataPoint[];
  compact?: boolean;
}

export default function Chart({ data, compact = false }: ChartProps) {
  if (compact) {
    const values = data.map((d) => d.value ?? d.close ?? 0);
    return (
      <Sparkline
        w="100%"
        h={80}
        data={values}
        curveType="monotone"
        color="indigo"
        fillOpacity={0.15}
      />
    );
  }

  const chartData = data.map((d) => ({ date: d.date, val: d.value ?? d.close }));

  return (
    <LineChart
      h={320}
      data={chartData}
      dataKey="date"
      series={[{ name: 'val', color: 'indigo.6' }]}
      withDots={false}
      curveType="monotone"
      xAxisProps={{ minTickGap: 40 }}
    />
  );
}
