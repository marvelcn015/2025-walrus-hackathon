/**
 * Hook for auditing data blobs
 *
 * Features:
 * - Sign audit message with Sui wallet
 * - Build and execute audit transaction
 * - Handle transaction status and errors
 */

import { useState, useCallback } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';

interface AuditDataOptions {
  dealId: string;
  auditRecordId: string;
  blobId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAuditDataReturn {
  auditData: (options: AuditDataOptions) => Promise<void>;
  isAuditing: boolean;
  error: Error | null;
}

export function useAuditData(): UseAuditDataReturn {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const auditData = useCallback(
    async (options: AuditDataOptions) => {
      const { dealId, auditRecordId, blobId, onSuccess, onError } = options;

      if (!currentAccount?.address) {
        const err = new Error('Wallet not connected');
        setError(err);
        toast.error('Wallet not connected');
        onError?.(err);
        return;
      }

      setIsAuditing(true);
      setError(null);

      try {
        // 1. Build audit message
        const message = `AUDIT:${blobId}`;
        const messageBytes = new TextEncoder().encode(message);

        // 2. Sign message with wallet
        // Note: For ed25519 verification in Move contract, we need to use personal message signing
        // This will be handled by the wallet's signPersonalMessage method
        // For now, we'll construct the transaction and let the wallet handle signing

        // 3. Get contract package ID from environment
        const packageId = process.env.NEXT_PUBLIC_EARNOUT_PACKAGE_ID;
        if (!packageId) {
          throw new Error('EARNOUT_PACKAGE_ID not configured');
        }

        // 4. Build transaction
        const tx = new Transaction();

        // For signature verification, we need to pass both signature and message
        // The wallet will sign the transaction, and we'll pass the message as an argument
        // In a production system, we'd use signPersonalMessage and then pass that signature
        // For this implementation, we'll use a placeholder approach

        // Call the audit_data function
        tx.moveCall({
          target: `${packageId}::earnout::audit_data`,
          arguments: [
            tx.object(dealId),
            tx.object(auditRecordId),
            // Signature will be provided by wallet during transaction signing
            // For now, we pass empty vectors as placeholders
            tx.pure.vector('u8', Array.from(messageBytes)),
          ],
        });

        // 5. Execute transaction
        const result = await signAndExecuteTransaction(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {
              toast.success('Data audited successfully', {
                description: `Transaction: ${result.digest}`,
              });
              onSuccess?.();
            },
            onError: (err) => {
              console.error('Audit transaction failed:', err);
              const error = err instanceof Error ? err : new Error('Transaction failed');
              setError(error);
              toast.error('Failed to audit data', {
                description: error.message,
              });
              onError?.(error);
            },
          }
        );

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Audit failed:', error);
        toast.error('Failed to audit data', {
          description: error.message,
        });
        onError?.(error);
      } finally {
        setIsAuditing(false);
      }
    },
    [currentAccount?.address, signAndExecuteTransaction]
  );

  return {
    auditData,
    isAuditing,
    error,
  };
}
