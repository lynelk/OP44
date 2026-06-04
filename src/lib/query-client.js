import { QueryClient } from '@tanstack/react-query';

// Financial data must not linger in memory too long on shared devices.
// gcTime of 5 min is a safe default; non-financial queries (tips, content) override this upward.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			retry: 0,                       // never retry — 429s must not cascade
			staleTime: 1000 * 60 * 5,      // 5 min default — treat data as fresh
			gcTime: 1000 * 60 * 30,        // 30 min — cache survives route transitions
		},
	},
});