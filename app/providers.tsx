'use client';

/**
 * Providers Component
 *
 * Wraps the app with necessary providers:
 * - Sui Wallet Provider (from @mysten/dapp-kit)
 * - React Query Provider (for data fetching)
 */

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Configure Sui networks
const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
  },
  devnet: {
    url: getFullnodeUrl('devnet'),
  },
  localnet: {
    url: 'http://localhost:9000',
  },
});

// Get network from environment
const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet' | 'localnet') || 'testnet';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={network}>
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
