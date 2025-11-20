/**
 * Deal Detail API Route
 *
 * GET /api/v1/deals/[dealId] - Get deal details
 */

import { NextRequest, NextResponse } from 'next/server';
import dealService from '@/src/backend/services/deal-service';

interface RouteParams {
  params: {
    dealId: string;
  };
}

/**
 * GET /api/v1/deals/[dealId]
 * Get detailed information about a specific deal
 *
 * Query parameters:
 * - userAddress: User's Sui address (optional, for role detection)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { dealId } = params;

    // Validate deal ID format
    if (!dealId || !dealId.startsWith('0x') || dealId.length !== 66) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid deal ID format',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    // Get deal details
    const deal = await dealService.getDeal(dealId, userAddress || undefined);

    if (!deal) {
      return NextResponse.json(
        {
          success: false,
          error: 'Deal not found',
        },
        { status: 404 }
      );
    }

    // Get statistics
    const statistics = await dealService.getDealStatistics(dealId);

    return NextResponse.json({
      success: true,
      data: {
        deal,
        statistics,
      },
    });
  } catch (error: any) {
    console.error('Error fetching deal details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch deal details',
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
