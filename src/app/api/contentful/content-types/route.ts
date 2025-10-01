import { NextResponse } from 'next/server';
import { getContentTypes } from '@/lib/contentful';

export async function GET() {
  try {
    const contentTypes = await getContentTypes();
    return NextResponse.json({ contentTypes });
  } catch (error) {
    console.error('Error fetching content types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content types' },
      { status: 500 }
    );
  }
}
