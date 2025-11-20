/**
 * useCreateDeal Hook
 *
 * Hook for creating new deals
 */

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiTransaction } from './useSuiTransaction';

interface CreateDealParams {
  name: string;
  closingDate: number;
  currency: string;
  seller: string;
  auditor: string;
  escrowAmount: number;
}

interface CreateDealResult {
  success: boolean;
  dealId?: string;
  transactionDigest?: string;
  error?: string;
}

export function useCreateDeal() {
  const currentAccount = useCurrentAccount();
  const { signAndExecute, isPending: isExecuting } = useSuiTransaction();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDeal = async (params: CreateDealParams): Promise<CreateDealResult> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!currentAccount?.address) {
        throw new Error('Please connect your wallet');
      }

      // Step 1: Call API to build transaction
      const response = await fetch('/api/v1/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          senderAddress: currentAccount.address,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to build transaction');
      }

      const result = await response.json();
      const transactionBytes = new Uint8Array(result.data.transactionBytes);

      // Step 2: Deserialize transaction
      const transaction = Transaction.from(transactionBytes);

      // Step 3: Sign and execute transaction
      const txResult = await signAndExecute(transaction);

      // Step 4: Extract deal ID from transaction effects
      const createdObjects = txResult.effects?.created || [];
      const dealObject = createdObjects.find((obj: any) =>
        obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner
      );

      setIsLoading(false);

      return {
        success: true,
        dealId: dealObject?.reference?.objectId,
        transactionDigest: txResult.digest,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create deal';
      setError(errorMessage);
      setIsLoading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  return {
    createDeal,
    isLoading: isLoading || isExecuting,
    error,
  };
}
