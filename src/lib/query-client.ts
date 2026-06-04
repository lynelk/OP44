import { QueryClient } from '@tanstack/react-query';

// Financial data must not linger in memory too long on shared devices.
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 min
      gcTime: 1000 * 60 * 5,    // 5 min — limit stale financial data in memory
    },
  },
});
