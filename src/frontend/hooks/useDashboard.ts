/**
 * React Query hooks for Dashboard
 * Uses mock data for now, will be replaced with real API calls later
 */

import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '@/src/frontend/lib/api-client';
import { getDashboardByDealId } from '@/src/frontend/lib/mock-data';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (dealId: string) => [...dashboardKeys.all, dealId] as const,
};

/**
 * Hook to fetch dashboard data for a specific deal
 */
export function useDashboard(dealId: string) {
  return useQuery<DashboardResponse>({
    queryKey: dashboardKeys.detail(dealId),
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Return mock dashboard data based on dealId
      // In real implementation, this would call the API with dealId
      return getDashboardByDealId(dealId);
    },
    enabled: !!dealId,
  });
}

/**
 * Hook to get current period information
 */
export function useCurrentPeriod(dealId: string) {
  const { data: dashboard } = useDashboard(dealId);

  if (!dashboard) {
    return null;
  }

  // Find the first period that is not settled
  const currentPeriod = dashboard.periodsSummary.find(
    (period) => period.settlementStatus !== 'settled'
  );

  return currentPeriod || dashboard.periodsSummary[dashboard.periodsSummary.length - 1];
}

/**
 * Hook to get pending actions for the current user
 */
export function usePendingActions(dealId: string) {
  const { data: dashboard } = useDashboard(dealId);

  if (!dashboard) {
    return [];
  }

  // Extract all next actions from periods
  const pendingActions = dashboard.periodsSummary
    .filter((period) => period.nextAction)
    .map((period) => ({
      periodId: period.periodId,
      periodName: period.name,
      action: period.nextAction!.action,
      actor: period.nextAction!.actor,
      deadline: period.nextAction!.deadline,
    }))
    .filter((action) => action.actor === dashboard.dealInfo.userRole);

  return pendingActions;
}
