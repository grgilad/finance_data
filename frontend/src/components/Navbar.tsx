import { useEffect, useState } from 'react';
import { Anchor, Group, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { getSeries } from '../api/client';

export default function Navbar() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    getSeries().then((all) => {
      const unique = [...new Set(all.map((s) => s.category).filter(Boolean))].sort();
      setCategories(unique);
    });
  }, []);

  return (
    <Group h="100%" px="md" gap="lg">
      <Text component={Link} to="/" fw={700} size="sm" c="dark" style={{ textDecoration: 'none' }}>
        Trade Data
      </Text>
      {categories.map((cat) => (
        <Anchor
          key={cat}
          component={Link}
          to={`/category/${cat}`}
          size="sm"
          c="dimmed"
          tt="capitalize"
          underline="never"
        >
          {cat}
        </Anchor>
      ))}
    </Group>
  );
}
