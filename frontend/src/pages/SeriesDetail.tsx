import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Group, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { getSeries, getSeriesData, type Series, type DataPoint } from '../api/client';
import Chart from '../components/Chart';

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const [series, setSeries] = useState<Series | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  const [from, setFrom] = useState<Date | null>(
    () => dayjs().subtract(5, 'year').toDate()
  );
  const [to, setTo] = useState<Date | null>(() => new Date());

  useEffect(() => {
    if (!id) return;
    getSeries().then((all) => {
      setSeries(all.find((s) => s.id === decodeURIComponent(id)) ?? null);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fromStr = from ? dayjs(from).format('YYYY-MM-DD') : undefined;
    const toStr = to ? dayjs(to).format('YYYY-MM-DD') : undefined;
    getSeriesData(decodeURIComponent(id), fromStr, toStr).then(setData);
  }, [id, from, to]);

  return (
    <>
      <Title order={2} mb="md">
        {series?.label ?? decodeURIComponent(id ?? '')}
      </Title>
      <Group mb="lg" align="flex-end">
        <DatePickerInput
          label="From"
          value={from}
          onChange={setFrom}
          valueFormat="YYYY-MM-DD"
          w={160}
        />
        <DatePickerInput
          label="To"
          value={to}
          onChange={setTo}
          valueFormat="YYYY-MM-DD"
          w={160}
        />
      </Group>
      <Chart data={data} />
    </>
  );
}
