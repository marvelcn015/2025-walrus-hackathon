/**
 * Deal Service - Business Logic Layer
 *
 * Handles deal management business logic:
 * - Deal creation and validation
 * - Parameter configuration
 * - Deal queries and transformations
 * - Integration with Sui blockchain
 */

import suiService, { DealInfo, PeriodData, DealStatus } from './sui-service';
import { Transaction } from '@mysten/sui/transactions';

// Types for API requests/responses
export interface CreateDealRequest {
  name: string;
  closingDate: number;
  currency: string;
  seller: string;
  auditor: string;
  escrowAmount: number;
}

export interface SetParametersRequest {
  dealId: string;
  periods: {
    name: string;
    startDate: number;
    endDate: number;
    kpiTypes: string[];
    formulaType: number;
    formulaParams: Record<string, string>;
  }[];
}

export interface DealResponse {
  dealId: string;
  name: string;
  closingDate: number;
  currency: string;
  buyer: string;
  seller: string;
  auditor: string;
  status: string;
  statusCode: number;
  escrowBalance: number;
  periodCount: number;
  role?: 'buyer' | 'seller' | 'auditor' | null;
  createdAt?: number;
}

export interface DealListResponse {
  deals: DealResponse[];
  total: number;
  role: 'buyer' | 'seller' | 'auditor' | 'all';
}

class DealService {
  /**
   * Validate deal creation parameters
   */
  validateCreateDeal(params: CreateDealRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.name || params.name.trim().length === 0) {
      errors.push('Deal name is required');
    }

    if (!params.seller || params.seller.length !== 66) {
      errors.push('Invalid seller address');
    }

    if (!params.auditor || params.auditor.length !== 66) {
      errors.push('Invalid auditor address');
    }

    if (params.escrowAmount <= 0) {
      errors.push('Escrow amount must be greater than 0');
    }

    if (!params.currency || params.currency.trim().length === 0) {
      errors.push('Currency is required');
    }

    if (params.closingDate <= Date.now()) {
      errors.push('Closing date must be in the future');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate parameters setup
   */
  validateSetParameters(params: SetParametersRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.dealId || params.dealId.length !== 66) {
      errors.push('Invalid deal ID');
    }

    if (!params.periods || params.periods.length === 0) {
      errors.push('At least one period is required');
    }

    // Validate each period
    params.periods.forEach((period, index) => {
      if (!period.name || period.name.trim().length === 0) {
        errors.push(`Period ${index + 1}: Name is required`);
      }

      if (period.startDate >= period.endDate) {
        errors.push(`Period ${index + 1}: Start date must be before end date`);
      }

      if (!period.kpiTypes || period.kpiTypes.length === 0) {
        errors.push(`Period ${index + 1}: At least one KPI type is required`);
      }

      if (period.formulaType < 0 || period.formulaType > 3) {
        errors.push(`Period ${index + 1}: Invalid formula type`);
      }
    });

    // Validate periods are sequential and non-overlapping
    for (let i = 0; i < params.periods.length - 1; i++) {
      if (params.periods[i].endDate > params.periods[i + 1].startDate) {
        errors.push(`Period ${i + 1} overlaps with period ${i + 2}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build transaction for creating a deal
   */
  async createDeal(
    params: CreateDealRequest,
    senderAddress: string
  ): Promise<{ transaction: Transaction; validation: { valid: boolean; errors: string[] } }> {
    const validation = this.validateCreateDeal(params);

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const transaction = await suiService.buildCreateDealTransaction(params, senderAddress);

    return {
      transaction,
      validation,
    };
  }

  /**
   * Build transaction for setting deal parameters
   */
  async setParameters(
    params: SetParametersRequest,
    senderAddress: string
  ): Promise<{ transaction: Transaction; validation: { valid: boolean; errors: string[] } }> {
    const validation = this.validateSetParameters(params);

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform periods to PeriodData format
    const periods: PeriodData[] = params.periods.map(period => ({
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      kpiTypes: period.kpiTypes,
      formulaType: period.formulaType,
      formulaParams: new Map(Object.entries(period.formulaParams)),
    }));

    const transaction = await suiService.buildSetParametersTransaction(
      params.dealId,
      periods,
      senderAddress
    );

    return {
      transaction,
      validation,
    };
  }

  /**
   * Get deal by ID
   */
  async getDeal(dealId: string, userAddress?: string): Promise<DealResponse | null> {
    const deal = await suiService.getDeal(dealId);

    if (!deal) {
      return null;
    }

    return this.transformDealInfo(deal, userAddress);
  }

  /**
   * Get all deals for a user
   */
  async getDealsForUser(
    userAddress: string,
    role?: 'buyer' | 'seller' | 'auditor' | 'all'
  ): Promise<DealListResponse> {
    const deals = await suiService.getDealsForUser(userAddress);

    // Filter by role if specified
    let filteredDeals = deals;
    if (role && role !== 'all') {
      filteredDeals = deals.filter(deal => {
        switch (role) {
          case 'buyer':
            return deal.buyer === userAddress;
          case 'seller':
            return deal.seller === userAddress;
          case 'auditor':
            return deal.auditor === userAddress;
          default:
            return true;
        }
      });
    }

    const transformedDeals = filteredDeals.map(deal => this.transformDealInfo(deal, userAddress));

    return {
      deals: transformedDeals,
      total: transformedDeals.length,
      role: role || 'all',
    };
  }

  /**
   * Transform DealInfo to DealResponse
   */
  private transformDealInfo(deal: DealInfo, userAddress?: string): DealResponse {
    // Determine user's role
    let role: 'buyer' | 'seller' | 'auditor' | null = null;
    if (userAddress) {
      if (deal.buyer === userAddress) role = 'buyer';
      else if (deal.seller === userAddress) role = 'seller';
      else if (deal.auditor === userAddress) role = 'auditor';
    }

    return {
      dealId: deal.objectId,
      name: deal.name,
      closingDate: deal.closingDate,
      currency: deal.currency,
      buyer: deal.buyer,
      seller: deal.seller,
      auditor: deal.auditor,
      status: this.getStatusName(deal.status),
      statusCode: deal.status,
      escrowBalance: deal.escrowBalance,
      periodCount: deal.periodCount,
      role,
    };
  }

  /**
   * Get human-readable status name
   */
  private getStatusName(statusCode: number): string {
    switch (statusCode) {
      case DealStatus.DRAFT:
        return 'draft';
      case DealStatus.ACTIVE:
        return 'active';
      case DealStatus.COMPLETED:
        return 'completed';
      case DealStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'unknown';
    }
  }

  /**
   * Calculate statistics for a deal
   */
  async getDealStatistics(dealId: string): Promise<{
    totalPeriods: number;
    completedPeriods: number;
    pendingPeriods: number;
    totalEscrow: number;
    totalPaidOut: number;
    remainingEscrow: number;
    progressPercentage: number;
  }> {
    const deal = await suiService.getDeal(dealId);

    if (!deal) {
      throw new Error('Deal not found');
    }

    // This is a simplified version - in production, you'd query all periods
    const totalPeriods = deal.periodCount;
    const totalEscrow = deal.escrowBalance;

    // Would need to iterate through periods to get accurate counts
    // For now, returning basic stats
    return {
      totalPeriods,
      completedPeriods: 0, // TODO: Query actual period statuses
      pendingPeriods: totalPeriods,
      totalEscrow,
      totalPaidOut: 0, // TODO: Calculate from settlements
      remainingEscrow: totalEscrow,
      progressPercentage: 0,
    };
  }

  /**
   * Check if user is authorized for a deal
   */
  async isAuthorized(dealId: string, userAddress: string): Promise<boolean> {
    const deal = await suiService.getDeal(dealId);

    if (!deal) {
      return false;
    }

    return (
      deal.buyer === userAddress ||
      deal.seller === userAddress ||
      deal.auditor === userAddress
    );
  }

  /**
   * Get user's role in a deal
   */
  async getUserRole(dealId: string, userAddress: string): Promise<'buyer' | 'seller' | 'auditor' | null> {
    const deal = await suiService.getDeal(dealId);

    if (!deal) {
      return null;
    }

    if (deal.buyer === userAddress) return 'buyer';
    if (deal.seller === userAddress) return 'seller';
    if (deal.auditor === userAddress) return 'auditor';

    return null;
  }
}

// Singleton instance
export const dealService = new DealService();

export default dealService;
