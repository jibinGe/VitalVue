import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute stale time for standard data
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
