import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateEntry } from '@/lib/contentful';
import { parseCSV, unflattenObject } from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const { contentTypeId, csvData, locale } = await request.json();

    if (!contentTypeId || !csvData) {
      return NextResponse.json(
        { error: 'Content Type ID and CSV data are required' },
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

    const results = {
      success: [] as string[],
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const unflattened = unflattenObject(row);
        const entryId = unflattened.id;

        // Remove system fields before creating/updating
        delete unflattened.id;
        delete unflattened.createdAt;
        delete unflattened.updatedAt;

        await createOrUpdateEntry(
          contentTypeId,
          entryId,
          unflattened,
          locale || 'ja-JP'
        );

        results.success.push(entryId || `Row ${i + 1}`);
      } catch (error: any) {
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
    console.error('Error importing entries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import entries' },
      { status: 500 }
    );
  }
}
