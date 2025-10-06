import { NextRequest, NextResponse } from 'next/server';
import { updateAssetMetadata, getSpaceDefaultLocale } from '@/lib/contentful';
import { parseCSV } from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const { csvData, locale } = await request.json();

    if (!csvData) {
      return NextResponse.json(
        { error: 'CSV data is required' },
        { status: 400 }
      );
    }

    const rows = parseCSV(csvData);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in CSV' },
        { status: 400 }
      );
    }

    // Auto-detect Space's default locale if not provided
    const targetLocale = locale || await getSpaceDefaultLocale();
    console.log(`Using locale: ${targetLocale}`);

    const results = {
      success: [] as string[],
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const assetId = row.id as string;

        if (!assetId) {
          throw new Error('Asset ID is required for update');
        }

        // Update metadata (title and description only)
        const fields: Record<string, any> = {};

        if (row.title !== undefined && row.title !== null && row.title !== '') {
          fields.title = row.title;
        }

        if (row.description !== undefined && row.description !== null) {
          fields.description = row.description;
        }

        // If no fields to update, skip
        if (Object.keys(fields).length === 0) {
          console.log(`Row ${i + 1}: No fields to update for asset ${assetId}`);
          results.success.push(assetId);
          continue;
        }

        console.log(`Row ${i + 1}: Updating asset ${assetId}`);

        await updateAssetMetadata(assetId, fields, targetLocale);

        results.success.push(assetId);
      } catch (error: any) {
        console.error(`Row ${i + 1} error:`, error.message);
        results.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      results,
      total: rows.length,
      successCount: results.success.length,
      errorCount: results.errors.length,
    });
  } catch (error: any) {
    console.error('Error importing assets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import assets' },
      { status: 500 }
    );
  }
}
