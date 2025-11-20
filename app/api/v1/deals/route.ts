/**
 * Deals API Routes
 *
 * POST /api/v1/deals - Create a new deal
 * GET /api/v1/deals - List deals for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import dealService, { CreateDealRequest } from '@/src/backend/services/deal-service';

/**
 * POST /api/v1/deals
 * Create a new earn-out deal
 *
 * This endpoint builds a transaction that the frontend will sign and execute.
 * The actual deal creation happens on-chain when the transaction is executed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, closingDate, currency, seller, auditor, escrowAmount, senderAddress } = body as CreateDealRequest & { senderAddress: string };

    if (!senderAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sender address is required',
        },
        { status: 400 }
      );
    }

    // Build transaction
    const { transaction, validation } = await dealService.createDeal(
      {
        name,
        closingDate,
        currency,
        seller,
        auditor,
        escrowAmount,
      },
      senderAddress
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Serialize transaction for frontend to sign
    const transactionBytes = await transaction.build({
      client: dealService['suiService']?.getClient(),
    });

    return NextResponse.json({
      success: true,
      data: {
        transactionBytes: Array.from(transactionBytes),
        message: 'Transaction prepared. Please sign and execute on the frontend.',
      },
    });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create deal',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/deals
 * List all deals for the current user
 *
 * Query parameters:
 * - userAddress: User's Sui address (required)
 * - role: Filter by role (buyer, seller, auditor, all) - optional
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    const role = searchParams.get('role') as 'buyer' | 'seller' | 'auditor' | 'all' | null;

    if (!userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'User address is required',
        },
        { status: 400 }
      );
    }

    // Validate Sui address format (basic check)
    if (!userAddress.startsWith('0x') || userAddress.length !== 66) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Sui address format',
        },
        { status: 400 }
      );
    }

    // Get deals for user
    const result = await dealService.getDealsForUser(userAddress, role || 'all');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch deals',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
