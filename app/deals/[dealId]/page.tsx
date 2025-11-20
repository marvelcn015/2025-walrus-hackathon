/**
 * Deal Details Page
 *
 * Displays detailed information about a specific deal
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useDeal } from '@/src/hooks/useDeal';
import { ConnectWallet } from '@/src/components/ConnectWallet';

interface DealDetailPageProps {
  params: {
    dealId: string;
  };
}

export default function DealDetailPage({ params }: DealDetailPageProps) {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { deal, statistics, isLoading, isError, error } = useDeal({
    dealId: params.dealId,
  });

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view deal details
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;

    const colors = {
      buyer: 'bg-purple-100 text-purple-800',
      seller: 'bg-orange-100 text-orange-800',
      auditor: 'bg-cyan-100 text-cyan-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[role as keyof typeof colors]}`}>
        Your Role: {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    const sui = amount / 1_000_000_000;
    return `${sui.toFixed(2)} SUI`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/deals')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Deals
            </button>
          </div>
          <ConnectWallet />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading deal details...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">
              {error?.message || 'Failed to load deal details'}
            </p>
          </div>
        )}

        {/* Deal Content */}
        {!isLoading && !isError && deal && (
          <>
            {/* Deal Header */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{deal.name}</h1>
                    <span className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(deal.status)}`}>
                      {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                    </span>
                  </div>
                  {getRoleBadge(deal.role || undefined)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Escrow Balance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatAmount(deal.escrowBalance)}
                  </p>
                  <p className="text-sm text-gray-600">{deal.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Closing Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDate(deal.closingDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Total Periods</p>
                  <p className="text-lg font-medium text-gray-900">{deal.periodCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Deal ID</p>
                  <p className="text-sm font-mono text-gray-900">
                    {deal.dealId.slice(0, 10)}...{deal.dealId.slice(-8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Participants</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <p className="text-sm font-medium text-purple-800 mb-2">Buyer</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{deal.buyer}</p>
                  {deal.buyer === currentAccount?.address && (
                    <span className="inline-block mt-2 text-xs bg-purple-200 text-purple-900 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <p className="text-sm font-medium text-orange-800 mb-2">Seller</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{deal.seller}</p>
                  {deal.seller === currentAccount?.address && (
                    <span className="inline-block mt-2 text-xs bg-orange-200 text-orange-900 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="border border-cyan-200 rounded-lg p-4 bg-cyan-50">
                  <p className="text-sm font-medium text-cyan-800 mb-2">Auditor</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{deal.auditor}</p>
                  {deal.auditor === currentAccount?.address && (
                    <span className="inline-block mt-2 text-xs bg-cyan-200 text-cyan-900 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            {statistics && (
              <div className="bg-white rounded-lg shadow-md p-8 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Statistics</h2>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Periods</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalPeriods}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{statistics.completedPeriods}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{statistics.pendingPeriods}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {statistics.progressPercentage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${statistics.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Escrow</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatAmount(statistics.totalEscrow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Paid Out</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatAmount(statistics.totalPaidOut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Remaining</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatAmount(statistics.remainingEscrow)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Actions</h2>

              {deal.status === 'draft' && deal.role === 'buyer' && (
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/deals/${deal.dealId}/setup`)}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Set Up Earn-out Parameters
                  </button>
                  <p className="text-sm text-gray-600 text-center">
                    Configure periods, KPI targets, and formulas to activate the deal
                  </p>
                </div>
              )}

              {deal.status === 'active' && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push(`/deals/${deal.dealId}/data`)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Upload Data
                  </button>
                  <button
                    onClick={() => router.push(`/deals/${deal.dealId}/kpi`)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Manage KPIs
                  </button>
                </div>
              )}

              {deal.status === 'completed' && (
                <div className="text-center py-4">
                  <p className="text-lg font-medium text-green-600 mb-2">
                    ✓ Deal Completed
                  </p>
                  <p className="text-sm text-gray-600">
                    All periods have been settled
                  </p>
                </div>
              )}

              {deal.status === 'cancelled' && (
                <div className="text-center py-4">
                  <p className="text-lg font-medium text-red-600 mb-2">
                    Deal Cancelled
                  </p>
                  <p className="text-sm text-gray-600">
                    This deal has been cancelled
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
