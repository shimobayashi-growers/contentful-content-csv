import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateEntry, getSpaceDefaultLocale } from '@/lib/contentful';
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
        const unflattened = unflattenObject(row);
        const entryId = unflattened.id;

        // Remove system fields before creating/updating
        delete unflattened.id;
        delete unflattened.createdAt;
        delete unflattened.updatedAt;

        const action = entryId ? 'update' : 'create';
        console.log(`Row ${i + 1}: ${action} entry ${entryId || '(new)'}`);

        const result = await createOrUpdateEntry(
          contentTypeId,
          entryId,
          unflattened,
          targetLocale
        );

        results.success.push(entryId || result.sys.id);
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
    console.error('Error importing entries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import entries' },
      { status: 500 }
    );
  }
}
