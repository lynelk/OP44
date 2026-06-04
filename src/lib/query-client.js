import { QueryClient } from '@tanstack/react-query';

// Sensible cache defaults reduce redundant API calls at scale (see SCALABILITY_AUDIT §3.2).
// Individual queries can override staleTime/refetchInterval for real-time data.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 1000 * 60 * 2,      // 2 min — treat data as fresh, avoid refetch storms
			gcTime: 1000 * 60 * 30,        // 30 min — keep cache for quick back-navigation
		},
	},
});
