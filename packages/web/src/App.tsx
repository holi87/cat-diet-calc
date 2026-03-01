import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Today } from './pages/Today';
import { CloseDayPage } from './pages/CloseDayPage';
import { CatsAdmin } from './pages/CatsAdmin';
import { FoodsAdmin } from './pages/FoodsAdmin';
import { WeightPage } from './pages/WeightPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/close-day" element={<CloseDayPage />} />
            <Route path="/admin/cats" element={<CatsAdmin />} />
            <Route path="/admin/foods" element={<FoodsAdmin />} />
            <Route path="/weight" element={<WeightPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
