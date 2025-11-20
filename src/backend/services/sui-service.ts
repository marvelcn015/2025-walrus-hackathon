/**
 * Sui Service - Blockchain Interaction Layer
 *
 * Handles all interactions with the Sui blockchain:
 * - Transaction building and execution
 * - Object queries and indexing
 * - Event listening
 * - Deal object management
 */

import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

// Environment configuration
const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io';
const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID_EARNOUT || '';

// Module names
const EARNOUT_MODULE = 'earnout';
const SEAL_POLICY_MODULE = 'seal_policy';

// Status constants
export const DealStatus = {
  DRAFT: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  CANCELLED: 3,
} as const;

export const PeriodStatus = {
  PENDING: 0,
  DATA_COLLECTION: 1,
  KPI_PROPOSED: 2,
  KPI_ATTESTED: 3,
  SETTLED: 4,
} as const;

export const FormulaType = {
  LINEAR: 0,
  STEPPED: 1,
  PERCENTAGE: 2,
  CUSTOM: 3,
} as const;

// Type definitions
export interface PeriodData {
  name: string;
  startDate: number;
  endDate: number;
  kpiTypes: string[];
  formulaType: number;
  formulaParams: Map<string, string>;
}

export interface WalrusBlobData {
  blobId: string;
  dataType: string;
  filename: string;
  size: number;
  encrypted: boolean;
}

export interface KPIValues {
  [kpiType: string]: number;
}

export interface DealInfo {
  objectId: string;
  name: string;
  buyer: string;
  seller: string;
  auditor: string;
  status: number;
  periodCount: number;
  escrowBalance: number;
  closingDate: number;
  currency: string;
}

export interface PeriodInfo {
  periodId: number;
  name: string;
  startDate: number;
  endDate: number;
  status: number;
  kpiTypes: string[];
  formulaType: number;
  walrusBlobs: WalrusBlobData[];
  kpiProposal?: {
    values: KPIValues;
    proposedBy: string;
    proposedAt: number;
    supportingBlobIds: string[];
    comments: string;
  };
  kpiAttestation?: {
    values: KPIValues;
    attestedBy: string;
    attestedAt: number;
    approved: boolean;
    verifiedBlobIds: string[];
    comments: string;
  };
  settlement?: {
    calculatedPayout: number;
    executedAt: number;
    executedBy: string;
    transactionHash: string;
  };
}

class SuiService {
  private client: SuiClient;

  constructor() {
    this.client = new SuiClient({ url: SUI_RPC_URL });
  }

  /**
   * Get the Sui client instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Build transaction to create a new deal
   */
  async buildCreateDealTransaction(
    params: {
      name: string;
      closingDate: number;
      currency: string;
      seller: string;
      auditor: string;
      escrowAmount: number;
    },
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    // Split coin for escrow
    const [escrowCoin] = tx.splitCoins(tx.gas, [params.escrowAmount]);

    // Call create_deal function
    tx.moveCall({
      target: `${PACKAGE_ID}::${EARNOUT_MODULE}::create_deal`,
      arguments: [
        tx.pure.string(params.name),
        tx.pure.u64(params.closingDate),
        tx.pure.string(params.currency),
        tx.pure.address(params.seller),
        tx.pure.address(params.auditor),
        escrowCoin,
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Build transaction to set deal parameters
   */
  async buildSetParametersTransaction(
    dealId: string,
    periods: PeriodData[],
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    // Serialize periods data
    const periodsArg = periods.map(period => ({
      name: period.name,
      start_date: period.startDate,
      end_date: period.endDate,
      kpi_types: period.kpiTypes,
      formula_type: period.formulaType,
      formula_params: Array.from(period.formulaParams.entries()),
    }));

    tx.moveCall({
      target: `${PACKAGE_ID}::${EARNOUT_MODULE}::set_parameters`,
      arguments: [
        tx.object(dealId),
        tx.pure(bcs.vector(bcs.struct('PeriodData', {
          name: bcs.string(),
          start_date: bcs.u64(),
          end_date: bcs.u64(),
          kpi_types: bcs.vector(bcs.string()),
          formula_type: bcs.u8(),
          formula_params: bcs.vector(bcs.tuple([bcs.string(), bcs.string()])),
        })).serialize(periodsArg).toBytes()),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Build transaction to add Walrus blob reference
   */
  async buildAddWalrusBlobTransaction(
    dealId: string,
    periodId: number,
    blobData: WalrusBlobData,
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    tx.moveCall({
      target: `${PACKAGE_ID}::${EARNOUT_MODULE}::add_walrus_blob`,
      arguments: [
        tx.object(dealId),
        tx.pure.u64(periodId),
        tx.pure.string(blobData.blobId),
        tx.pure.string(blobData.dataType),
        tx.pure.string(blobData.filename),
        tx.pure.u64(blobData.size),
        tx.pure.bool(blobData.encrypted),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Build transaction to propose KPI
   */
  async buildProposeKPITransaction(
    dealId: string,
    periodId: number,
    kpiValues: KPIValues,
    supportingBlobIds: string[],
    comments: string,
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    const kpiEntries = Object.entries(kpiValues);

    tx.moveCall({
      target: `${PACKAGE_ID}::${EARNOUT_MODULE}::propose_kpi`,
      arguments: [
        tx.object(dealId),
        tx.pure.u64(periodId),
        tx.pure(bcs.vector(bcs.tuple([bcs.string(), bcs.u64()])).serialize(kpiEntries).toBytes()),
        tx.pure(bcs.vector(bcs.string()).serialize(supportingBlobIds).toBytes()),
        tx.pure.string(comments),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Build transaction to attest KPI
   */
  async buildAttestKPITransaction(
    dealId: string,
    periodId: number,
    attestedValues: KPIValues,
    approved: boolean,
    verifiedBlobIds: string[],
    comments: string,
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    const kpiEntries = Object.entries(attestedValues);

    tx.moveCall({
      target: `${PACKAGE_ID}::${EARNOUT_MODULE}::attest_kpi`,
      arguments: [
        tx.object(dealId),
        tx.pure.u64(periodId),
        tx.pure(bcs.vector(bcs.tuple([bcs.string(), bcs.u64()])).serialize(kpiEntries).toBytes()),
        tx.pure.bool(approved),
        tx.pure(bcs.vector(bcs.string()).serialize(verifiedBlobIds).toBytes()),
        tx.pure.string(comments),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Build transaction to settle a period
   */
  async buildSettleTransaction(
    dealId: string,
    periodId: number,
    calculatedPayout: number,
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    tx.moveCall({
      target: `${PACKAGE_ID}::${EARNOUT_MODULE}::settle`,
      arguments: [
        tx.object(dealId),
        tx.pure.u64(periodId),
        tx.pure.u64(calculatedPayout),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Build transaction to create Seal policy
   */
  async buildCreateSealPolicyTransaction(
    dealId: string,
    blobId: string,
    registryId: string,
    senderAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(senderAddress);

    tx.moveCall({
      target: `${PACKAGE_ID}::${SEAL_POLICY_MODULE}::create_policy`,
      arguments: [
        tx.object(registryId), // Policy registry (shared object)
        tx.object(dealId),
        tx.pure.string(blobId),
        tx.object('0x6'), // Clock object
      ],
    });

    return tx;
  }

  /**
   * Query deal object by ID
   */
  async getDeal(dealId: string): Promise<DealInfo | null> {
    try {
      const object = await this.client.getObject({
        id: dealId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });

      if (!object.data || !object.data.content || object.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = object.data.content.fields as any;

      return {
        objectId: dealId,
        name: fields.name,
        buyer: fields.buyer,
        seller: fields.seller,
        auditor: fields.auditor,
        status: fields.status,
        periodCount: Number(fields.period_count),
        escrowBalance: Number(fields.escrow_balance),
        closingDate: Number(fields.closing_date),
        currency: fields.currency,
      };
    } catch (error) {
      console.error('Error fetching deal:', error);
      return null;
    }
  }

  /**
   * Query all deals for a user (as buyer, seller, or auditor)
   */
  async getDealsForUser(userAddress: string): Promise<DealInfo[]> {
    try {
      // Query owned objects
      const ownedDeals = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${PACKAGE_ID}::${EARNOUT_MODULE}::Deal`,
        },
        options: {
          showContent: true,
        },
      });

      const deals: DealInfo[] = [];

      for (const obj of ownedDeals.data) {
        if (obj.data && obj.data.content && obj.data.content.dataType === 'moveObject') {
          const fields = obj.data.content.fields as any;
          deals.push({
            objectId: obj.data.objectId,
            name: fields.name,
            buyer: fields.buyer,
            seller: fields.seller,
            auditor: fields.auditor,
            status: fields.status,
            periodCount: Number(fields.period_count),
            escrowBalance: Number(fields.escrow_balance),
            closingDate: Number(fields.closing_date),
            currency: fields.currency,
          });
        }
      }

      // Also query dynamic fields/events to find deals where user is seller or auditor
      // This requires indexing or event querying
      // For now, return owned deals

      return deals;
    } catch (error) {
      console.error('Error fetching deals for user:', error);
      return [];
    }
  }

  /**
   * Get period information
   */
  async getPeriod(dealId: string, periodId: number): Promise<PeriodInfo | null> {
    try {
      const deal = await this.client.getObject({
        id: dealId,
        options: {
          showContent: true,
        },
      });

      if (!deal.data || !deal.data.content || deal.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = deal.data.content.fields as any;
      const periodsTable = fields.periods;

      // Query dynamic field for specific period
      const periodField = await this.client.getDynamicFieldObject({
        parentId: periodsTable.fields.id.id,
        name: {
          type: 'u64',
          value: periodId.toString(),
        },
      });

      if (!periodField.data || !periodField.data.content || periodField.data.content.dataType !== 'moveObject') {
        return null;
      }

      const periodFields = periodField.data.content.fields as any;

      return {
        periodId,
        name: periodFields.name,
        startDate: Number(periodFields.start_date),
        endDate: Number(periodFields.end_date),
        status: periodFields.status,
        kpiTypes: periodFields.kpi_types,
        formulaType: periodFields.formula_type,
        walrusBlobs: periodFields.walrus_blobs || [],
        kpiProposal: periodFields.kpi_proposal,
        kpiAttestation: periodFields.kpi_attestation,
        settlement: periodFields.settlement,
      };
    } catch (error) {
      console.error('Error fetching period:', error);
      return null;
    }
  }

  /**
   * Listen to deal events
   */
  async subscribeToEvents(
    eventType: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    const unsubscribe = await this.client.subscribeEvent({
      filter: {
        MoveEventType: `${PACKAGE_ID}::${EARNOUT_MODULE}::${eventType}`,
      },
      onMessage: (event) => {
        callback(event);
      },
    });

    return unsubscribe;
  }

  /**
   * Get transaction details
   */
  async getTransaction(digest: string): Promise<SuiTransactionBlockResponse | null> {
    try {
      return await this.client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: Transaction): Promise<bigint> {
    try {
      const dryRun = await this.client.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: this.client }),
      });

      return BigInt(dryRun.effects.gasUsed.computationCost) +
             BigInt(dryRun.effects.gasUsed.storageCost) -
             BigInt(dryRun.effects.gasUsed.storageRebate);
    } catch (error) {
      console.error('Error estimating gas:', error);
      return BigInt(0);
    }
  }
}

// Singleton instance
export const suiService = new SuiService();

export default suiService;
