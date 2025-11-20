/**
 * Create Deal Page
 *
 * Form for creating a new earn-out deal
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useCreateDeal } from '@/src/hooks/useCreateDeal';
import { ConnectWallet } from '@/src/components/ConnectWallet';

export default function CreateDealPage() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { createDeal, isLoading, error } = useCreateDeal();

  const [formData, setFormData] = useState({
    name: '',
    closingDate: '',
    currency: 'USD',
    seller: '',
    auditor: '',
    escrowAmount: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Deal name is required';
    }

    if (!formData.closingDate) {
      errors.closingDate = 'Closing date is required';
    } else {
      const closingDate = new Date(formData.closingDate).getTime();
      if (closingDate <= Date.now()) {
        errors.closingDate = 'Closing date must be in the future';
      }
    }

    if (!formData.seller.trim()) {
      errors.seller = 'Seller address is required';
    } else if (!formData.seller.startsWith('0x') || formData.seller.length !== 66) {
      errors.seller = 'Invalid Sui address format';
    }

    if (!formData.auditor.trim()) {
      errors.auditor = 'Auditor address is required';
    } else if (!formData.auditor.startsWith('0x') || formData.auditor.length !== 66) {
      errors.auditor = 'Invalid Sui address format';
    }

    if (!formData.escrowAmount || parseFloat(formData.escrowAmount) <= 0) {
      errors.escrowAmount = 'Escrow amount must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    const result = await createDeal({
      name: formData.name,
      closingDate: new Date(formData.closingDate).getTime(),
      currency: formData.currency,
      seller: formData.seller,
      auditor: formData.auditor,
      escrowAmount: Math.floor(parseFloat(formData.escrowAmount) * 1_000_000_000), // Convert to MIST
    });

    if (result.success) {
      setSuccessMessage('Deal created successfully!');
      setTimeout(() => {
        router.push(`/deals/${result.dealId}`);
      }, 2000);
    }
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to create a deal
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Deal</h1>
          <ConnectWallet />
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Deal Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Deal Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Acme Corp Acquisition"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            {/* Closing Date */}
            <div>
              <label htmlFor="closingDate" className="block text-sm font-medium text-gray-700 mb-2">
                Closing Date *
              </label>
              <input
                type="date"
                id="closingDate"
                name="closingDate"
                value={formData.closingDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.closingDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.closingDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.closingDate}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency *
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SUI">SUI</option>
              </select>
            </div>

            {/* Seller Address */}
            <div>
              <label htmlFor="seller" className="block text-sm font-medium text-gray-700 mb-2">
                Seller Address *
              </label>
              <input
                type="text"
                id="seller"
                name="seller"
                value={formData.seller}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                  formErrors.seller ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0x..."
              />
              {formErrors.seller && (
                <p className="mt-1 text-sm text-red-600">{formErrors.seller}</p>
              )}
            </div>

            {/* Auditor Address */}
            <div>
              <label htmlFor="auditor" className="block text-sm font-medium text-gray-700 mb-2">
                Auditor Address *
              </label>
              <input
                type="text"
                id="auditor"
                name="auditor"
                value={formData.auditor}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                  formErrors.auditor ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0x..."
              />
              {formErrors.auditor && (
                <p className="mt-1 text-sm text-red-600">{formErrors.auditor}</p>
              )}
            </div>

            {/* Escrow Amount */}
            <div>
              <label htmlFor="escrowAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Escrow Amount (SUI) *
              </label>
              <input
                type="number"
                id="escrowAmount"
                name="escrowAmount"
                value={formData.escrowAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.escrowAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="100.00"
              />
              {formErrors.escrowAmount && (
                <p className="mt-1 text-sm text-red-600">{formErrors.escrowAmount}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Funds will be held in escrow for settlement payments
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/deals')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>After creating the deal, you'll set up earn-out periods</li>
            <li>Define KPI targets and formulas for each period</li>
            <li>Upload financial data throughout the earn-out period</li>
            <li>Propose and attest KPIs with the auditor</li>
            <li>Execute automated settlements</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
