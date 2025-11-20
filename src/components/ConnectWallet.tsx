/**
 * ConnectWallet Component
 *
 * Button for connecting/disconnecting Sui wallet
 */

'use client';

import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from '@mysten/dapp-kit';
import { useState } from 'react';

export function ConnectWallet() {
  const currentAccount = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const [showWallets, setShowWallets] = useState(false);

  if (currentAccount) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWallets(!showWallets)}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Connect Wallet
      </button>

      {showWallets && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
          <div className="text-sm font-medium text-gray-700 px-3 py-2 mb-1">
            Select Wallet
          </div>
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => {
                connect({ wallet });
                setShowWallets(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              {wallet.icon && (
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-6 h-6"
                />
              )}
              <span className="text-sm font-medium">{wallet.name}</span>
            </button>
          ))}
          {wallets.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No wallets detected. Please install a Sui wallet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
