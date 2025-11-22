/**
 * Period Blobs API Route
 *
 * GET /api/v1/deals/:dealId/periods/:periodId/blobs - Get all blobs for a specific period
 */

import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/src/backend/services/sui-service';
import { walrusService } from '@/src/backend/services/walrus-service';

/**
 * GET /api/v1/deals/:dealId/periods/:periodId/blobs
 *
 * Fetches all Walrus blob references registered for a specific period from the blockchain.
 * This endpoint queries the Deal object on Sui and returns the blobs associated with the given periodId.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string; periodId: string }> }
) {
  try {
    const { dealId, periodId } = await params;

    // Validate dealId format
    const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!suiAddressRegex.test(dealId)) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid deal ID format',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate periodId is provided
    if (!periodId || typeof periodId !== 'string' || periodId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Period ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Query blobs from blockchain
    const blobs = await suiService.getSubperiodBlobReferences(dealId, periodId);

    // Fetch metadata from Walrus for each blob
    const blobsWithMetadata = await Promise.all(
      blobs.map(async (blob) => {
        try {
          // Download blob from Walrus to extract metadata
          const walrusBlob = await walrusService.download(blob.blobId);

          return {
            blobId: blob.blobId,
            dataType: blob.dataType,
            uploadedAt: blob.uploadedAt,
            uploaderAddress: blob.uploaderAddress,
            metadata: walrusBlob.metadata,
          };
        } catch (error) {
          console.error(`Failed to fetch metadata for blob ${blob.blobId}:`, error);
          // Return the on-chain data as a fallback
          return {
            blobId: blob.blobId,
            dataType: blob.dataType,
            uploadedAt: blob.uploadedAt,
            uploaderAddress: blob.uploaderAddress,
            metadata: {
              filename: 'Error reading filename',
            },
          };
        }
      })
    );

    // Format response
    return NextResponse.json(
      {
        dealId,
        periodId,
        blobs: blobsWithMetadata,
        total: blobsWithMetadata.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch period blobs:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Deal not found')) {
        return NextResponse.json(
          {
            error: 'NotFoundError',
            message: 'Deal not found',
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Subperiod') && error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'NotFoundError',
            message: 'Period not found',
            statusCode: 404,
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'ServerError',
        message: 'Failed to fetch period blobs',
        statusCode: 500,
        details: {
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
