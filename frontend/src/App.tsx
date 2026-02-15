import { AppShell } from '@mantine/core';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Category from './pages/Category';
import SeriesDetail from './pages/SeriesDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell header={{ height: 50 }} padding="md">
        <AppShell.Header>
          <Navbar />
        </AppShell.Header>
        <AppShell.Main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/category/:name" element={<Category />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </BrowserRouter>
  );
}
