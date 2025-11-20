import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @swagger
 * /api/v1/deals/{dealId}/blobs:
 *   get:
 *     summary: Get all blobs associated with a specific deal
 *     description: Retrieves a list of blob metadata for a given deal ID, providing details about each file uploaded in the context of the deal.
 *     tags:
 *       - "Deal Management"
 *     parameters:
 *       - in: path
 *         name: dealId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the deal.
 *     responses:
 *       '200':
 *         description: A list of blobs for the deal.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WalrusBlob'
 *       '404':
 *         description: Deal not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  const { dealId } = params;

  // In a real implementation, you would fetch this data from a service
  // based on the dealId. For now, we return mock data.
  const mockBlobs = [
    {
      blobId: 'blob-abc-123',
      commitment: '0xcommitment123',
      size: 1024,
      uploadedAt: new Date().toISOString(),
      endEpoch: 123456,
      metadata: {
        dataType: 'financial_statement',
        periodId: '2025-q1',
        dealId: dealId,
        uploaderAddress: '0xuploader1',
        filename: 'Q1_Financials.pdf',
        mimeType: 'application/pdf',
        description: 'Q1 Financial Statement for the deal.',
      },
    },
    {
      blobId: 'blob-def-456',
      commitment: '0xcommitment456',
      size: 2048,
      uploadedAt: new Date().toISOString(),
      endEpoch: 123457,
      metadata: {
        dataType: 'cap_table',
        periodId: '2025-q1',
        dealId: dealId,
        uploaderAddress: '0xuploader2',
        filename: 'Cap_Table_Updated.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Updated capitalization table.',
      },
    },
  ];

  return NextResponse.json(mockBlobs);
}