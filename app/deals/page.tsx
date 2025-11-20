/**
 * Deals List Page
 *
 * Displays all deals for the current user
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useDeals } from '@/src/hooks/useDeals';
import { ConnectWallet } from '@/src/components/ConnectWallet';

export default function DealsPage() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'seller' | 'auditor'>('all');
  const { deals, isLoading, isError, error } = useDeals({ role: roleFilter });

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your deals
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
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[role as keyof typeof colors]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    // Convert from MIST to SUI
    const sui = amount / 1_000_000_000;
    return `${sui.toFixed(2)} SUI`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Deals</h1>
            <p className="text-gray-600 mt-1">Manage your earn-out agreements</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/deals/create')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create New Deal
            </button>
            <ConnectWallet />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(['all', 'buyer', 'seller', 'auditor'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                roleFilter === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading deals...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">
              {error?.message || 'Failed to load deals'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && deals.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Deals Found</h3>
            <p className="text-gray-600 mb-6">
              {roleFilter === 'all'
                ? "You haven't created or been added to any deals yet."
                : `You have no deals as ${roleFilter}.`}
            </p>
            <button
              onClick={() => router.push('/deals/create')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Your First Deal
            </button>
          </div>
        )}

        {/* Deals List */}
        {!isLoading && !isError && deals.length > 0 && (
          <div className="grid gap-4">
            {deals.map((deal) => (
              <div
                key={deal.dealId}
                onClick={() => router.push(`/deals/${deal.dealId}`)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{deal.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(deal.status)}`}>
                        {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                      </span>
                      {getRoleBadge(deal.role || undefined)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Closing Date: {formatDate(deal.closingDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Escrow Balance</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatAmount(deal.escrowBalance, deal.currency)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Buyer</p>
                    <p className="text-sm font-mono text-gray-900">
                      {deal.buyer.slice(0, 6)}...{deal.buyer.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Seller</p>
                    <p className="text-sm font-mono text-gray-900">
                      {deal.seller.slice(0, 6)}...{deal.seller.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Auditor</p>
                    <p className="text-sm font-mono text-gray-900">
                      {deal.auditor.slice(0, 6)}...{deal.auditor.slice(-4)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {deal.periodCount} {deal.periodCount === 1 ? 'Period' : 'Periods'}
                    </span>
                  </div>
                  <button
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/deals/${deal.dealId}`);
                    }}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {!isLoading && !isError && deals.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Deals</p>
                <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {deals.filter((d) => d.status === 'active').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {deals.filter((d) => d.status === 'completed').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Escrow</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAmount(
                    deals.reduce((sum, d) => sum + d.escrowBalance, 0),
                    'SUI'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
