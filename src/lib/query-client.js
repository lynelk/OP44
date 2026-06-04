import { QueryClient } from '@tanstack/react-query';

// Financial data must not linger in memory too long on shared devices.
// gcTime of 5 min is a safe default; non-financial queries (tips, content) override this upward.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 1000 * 60 * 2,      // 2 min — treat data as fresh, avoid refetch storms
			gcTime: 1000 * 60 * 5,         // 5 min — limit stale financial data in memory
		},
	},
});
