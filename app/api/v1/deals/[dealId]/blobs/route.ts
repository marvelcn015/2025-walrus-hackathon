/**
 * API Route: GET /api/v1/deals/{dealId}/blobs
 *
 * List all Walrus blobs associated with a deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusController } from '@/src/backend/controllers/walrus-controller';
import type { ListDealBlobsQuery, DataType } from '@/src/shared/types/walrus';

/**
 * GET /api/v1/deals/{dealId}/blobs
 *
 * Query parameters:
 * - periodId (optional): Filter by specific period
 * - dataType (optional): Filter by data type
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50, max: 100)
 *
 * Headers:
 * - X-Sui-Address: User's Sui wallet address
 * - X-Sui-Signature: Signature of the timestamp
 * - X-Sui-Signature-Message: ISO timestamp that was signed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    // Validate dealId format
    const dealIdPattern = /^0x[a-fA-F0-9]{64}$/;
    if (!dealIdPattern.test(dealId)) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid deal ID format',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query: ListDealBlobsQuery = {};

    // Optional filters
    const periodId = searchParams.get('periodId');
    if (periodId) {
      query.periodId = periodId;
    }

    const dataType = searchParams.get('dataType');
    if (dataType) {
      // Validate dataType enum
      const validDataTypes: DataType[] = [
        'revenue_journal',
        'ebitda_report',
        'expense_report',
        'balance_sheet',
        'cash_flow',
        'kpi_calculation',
        'audit_report',
        'custom',
      ];
      if (!validDataTypes.includes(dataType as DataType)) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: `Invalid dataType. Must be one of: ${validDataTypes.join(', ')}`,
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      query.dataType = dataType as DataType;
    }

    // Pagination parameters
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (isNaN(page) || page < 1) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: 'Page number must be a positive integer',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      query.page = page;
    }

    const limitParam = searchParams.get('limit');
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: 'Limit must be between 1 and 100',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      query.limit = limit;
    }

    // Delegate to controller
    return await walrusController.handleListDealBlobs(request, dealId, query);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        statusCode: 500,
        details: {
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
