/**
 * useSuiTransaction Hook
 *
 * Custom hook for signing and executing Sui transactions
 */

import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';

interface UseSuiTransactionReturn {
  signAndExecute: (transaction: Transaction) => Promise<SuiTransactionBlockResponse>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSuiTransaction(): UseSuiTransactionReturn {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signAndExecute = async (transaction: Transaction): Promise<SuiTransactionBlockResponse> => {
    setIsPending(true);
    setError(null);

    try {
      // Sign and execute transaction
      const result = await signAndExecuteTransaction(
        {
          transaction,
        },
        {
          onSuccess: (result) => {
            console.log('Transaction executed successfully:', result);
          },
        }
      );

      // Wait for transaction to be confirmed
      const confirmedTx = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      setIsPending(false);
      return confirmedTx;
    } catch (err: any) {
      const error = new Error(err.message || 'Transaction failed');
      setError(error);
      setIsPending(false);
      throw error;
    }
  };

  const reset = () => {
    setIsPending(false);
    setError(null);
  };

  return {
    signAndExecute,
    isPending,
    error,
    reset,
  };
}
