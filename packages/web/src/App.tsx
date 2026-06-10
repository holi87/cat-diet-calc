import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorToasts } from './components/ErrorToasts';
import { showErrorToast } from './lib/toast';
import { Today } from './pages/Today';
import { CloseDayPage } from './pages/CloseDayPage';
import { CatsAdmin } from './pages/CatsAdmin';
import { FoodsAdmin } from './pages/FoodsAdmin';
import { WeightPage } from './pages/WeightPage';
import { HistoryPage } from './pages/HistoryPage';
import { DataPage } from './pages/DataPage';
import { NotFound } from './pages/NotFound';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'nieznany błąd';
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // OfflineBanner already explains failures while offline
      if (!navigator.onLine) return;
      showErrorToast(`Błąd pobierania danych: ${errorMessage(error)}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Mutations with a local onError render their own message
      if (mutation.options.onError) return;
      showErrorToast(`Błąd zapisu: ${errorMessage(error)}`);
    },
  }),
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
      <ErrorBoundary>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/close-day" element={<CloseDayPage />} />
              <Route path="/admin/cats" element={<CatsAdmin />} />
              <Route path="/admin/foods" element={<FoodsAdmin />} />
              <Route path="/weight" element={<WeightPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/admin/data" element={<DataPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <ErrorToasts />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
