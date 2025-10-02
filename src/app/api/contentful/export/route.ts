import { NextRequest, NextResponse } from 'next/server';
import { getEntries } from '@/lib/contentful';
import { convertToCSV } from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const { contentTypeId, locale, selectedFields } = await request.json();

    console.log('Export request:', { contentTypeId, locale, selectedFields });

    if (!contentTypeId) {
      return NextResponse.json(
        { error: 'Content Type ID is required' },
        { status: 400 }
      );
    }

    if (!selectedFields || selectedFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be selected' },
        { status: 400 }
      );
    }

    const entries = await getEntries(contentTypeId, locale || 'ja-JP', selectedFields);

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found for this content type' },
        { status: 404 }
      );
    }

    // flattenせずにそのままCSV変換（すでにフィールド選択済み）
    const csv = convertToCSV(entries, false);

    // ファイル名を日時形式（yyyymmddhhmmss）で生成
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `${contentTypeId}_${timestamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=${filename}`,
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
