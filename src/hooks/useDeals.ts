/**
 * useDeals Hook
 *
 * Fetches and manages list of deals for the current user
 */

import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit';

interface Deal {
  dealId: string;
  name: string;
  closingDate: number;
  currency: string;
  buyer: string;
  seller: string;
  auditor: string;
  status: string;
  statusCode: number;
  escrowBalance: number;
  periodCount: number;
  role?: 'buyer' | 'seller' | 'auditor' | null;
}

interface DealsResponse {
  deals: Deal[];
  total: number;
  role: 'buyer' | 'seller' | 'auditor' | 'all';
}

interface UseDealsOptions {
  role?: 'buyer' | 'seller' | 'auditor' | 'all';
  enabled?: boolean;
}

export function useDeals(options: UseDealsOptions = {}) {
  const currentAccount = useCurrentAccount();
  const { role = 'all', enabled = true } = options;

  const query = useQuery<DealsResponse>({
    queryKey: ['deals', currentAccount?.address, role],
    queryFn: async () => {
      if (!currentAccount?.address) {
        throw new Error('No wallet connected');
      }

      const params = new URLSearchParams({
        userAddress: currentAccount.address,
        role: role,
      });

      const response = await fetch(`/api/v1/deals?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch deals');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: enabled && !!currentAccount?.address,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    deals: query.data?.deals || [],
    total: query.data?.total || 0,
    role: query.data?.role || 'all',
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
