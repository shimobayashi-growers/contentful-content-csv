import { NextRequest, NextResponse } from 'next/server';
import { getEntries } from '@/lib/contentful';
import { convertToCSV } from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const { contentTypeId, locale } = await request.json();

    if (!contentTypeId) {
      return NextResponse.json(
        { error: 'Content Type ID is required' },
        { status: 400 }
      );
    }

    const entries = await getEntries(contentTypeId, locale || 'ja-JP');

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found for this content type' },
        { status: 404 }
      );
    }

    const csv = convertToCSV(entries);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${contentTypeId}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting entries:', error);
    return NextResponse.json(
      { error: 'Failed to export entries' },
      { status: 500 }
    );
  }
}
