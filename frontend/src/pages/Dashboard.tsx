import { useEffect, useState } from 'react';
import { Card, SimpleGrid, Skeleton, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { getSeries, getSeriesData, type Series, type DataPoint } from '../api/client';
import Chart from '../components/Chart';

function ninetyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

export default function Dashboard() {
  const [series, setSeries] = useState<Series[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, DataPoint[]>>({});

  useEffect(() => {
    const from = ninetyDaysAgo();
    getSeries().then((all) => {
      setSeries(all);
      all.forEach((s) => {
        getSeriesData(s.id, from).then((data) =>
          setDataMap((prev) => ({ ...prev, [s.id]: data }))
        );
      });
    });
  }, []);

  return (
    <>
      <Title order={2} mb="lg">Dashboard</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {series.map((s) => (
          <Card
            key={s.id}
            component={Link}
            to={`/series/${encodeURIComponent(s.id)}`}
            withBorder
            padding="sm"
            style={{ textDecoration: 'none' }}
          >
            <Text fw={600} size="sm" mb={2}>{s.label}</Text>
            <Text size="xs" c="dimmed" tt="capitalize" mb="xs">{s.category}</Text>
            {dataMap[s.id] ? (
              <Chart data={dataMap[s.id]} compact />
            ) : (
              <Skeleton height={80} />
            )}
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}
