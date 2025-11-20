/**
 * useDeal Hook
 *
 * Fetches and manages a single deal's detailed information
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

interface DealStatistics {
  totalPeriods: number;
  completedPeriods: number;
  pendingPeriods: number;
  totalEscrow: number;
  totalPaidOut: number;
  remainingEscrow: number;
  progressPercentage: number;
}

interface DealDetailResponse {
  deal: Deal;
  statistics: DealStatistics;
}

interface UseDealOptions {
  dealId: string;
  enabled?: boolean;
}

export function useDeal(options: UseDealOptions) {
  const currentAccount = useCurrentAccount();
  const { dealId, enabled = true } = options;

  const query = useQuery<DealDetailResponse>({
    queryKey: ['deal', dealId, currentAccount?.address],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentAccount?.address) {
        params.append('userAddress', currentAccount.address);
      }

      const url = `/api/v1/deals/${dealId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch deal');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: enabled && !!dealId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    deal: query.data?.deal,
    statistics: query.data?.statistics,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
