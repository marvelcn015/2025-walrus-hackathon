'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectWallet } from '@/src/components/ConnectWallet';

export default function Home() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    // Auto-redirect if wallet is connected
    if (currentAccount) {
      router.push('/deals');
    }
  }, [currentAccount, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Earnout Management System
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            M&A Earn-out Management on Sui Blockchain
          </p>
          <p className="text-gray-600">
            Powered by Walrus & Seal for secure, decentralized data storage
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Get Started
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your Sui wallet to create and manage earn-out deals
            </p>
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              Key Features
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Secure & Transparent</h4>
                <p className="text-sm text-gray-600">
                  All deals on Sui blockchain with encrypted financial data
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Automated Settlements</h4>
                <p className="text-sm text-gray-600">
                  Smart contracts handle KPI verification and payouts
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Multi-Period Tracking</h4>
                <p className="text-sm text-gray-600">
                  Track multiple earn-out periods with different KPI targets
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Built with Next.js, Sui, Walrus, and Seal |{' '}
            <a href="/api-docs" className="text-blue-600 hover:underline">
              API Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
