import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Anchor, Skeleton, Stack, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { getSeries, getSeriesData, type Series, type DataPoint } from '../api/client';
import Chart from '../components/Chart';

export default function Category() {
  const { name } = useParams<{ name: string }>();
  const [items, setItems] = useState<Series[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, DataPoint[]>>({});

  useEffect(() => {
    setDataMap({});
    getSeries().then((all) => {
      const filtered = all.filter((s) => s.category === name);
      setItems(filtered);
      filtered.forEach((s) => {
        getSeriesData(s.id).then((data) =>
          setDataMap((prev) => ({ ...prev, [s.id]: data }))
        );
      });
    });
  }, [name]);

  return (
    <>
      <Title order={2} tt="capitalize" mb="lg">{name}</Title>
      <Stack gap="xl">
        {items.map((s) => (
          <div key={s.id}>
            <Anchor
              component={Link}
              to={`/series/${encodeURIComponent(s.id)}`}
              fw={600}
              size="sm"
              c="dark"
              underline="never"
              mb="xs"
              display="block"
            >
              {s.label}
            </Anchor>
            {dataMap[s.id] ? (
              <Chart data={dataMap[s.id]} />
            ) : (
              <Skeleton height={320} />
            )}
          </div>
        ))}
      </Stack>
    </>
  );
}
