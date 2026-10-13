import { NextRequest, NextResponse } from 'next/server';
import { AIParseRequestSchema } from '@/lib/validation/quotation';
import { parseQuotationWithOllama } from '@/lib/ai/ollama';


export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body sent in request.' },
        { status: 400 }
      );
    }

    const validationResult = AIParseRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues
        .map((issue) => issue.message)
        .join(', ');
      return NextResponse.json(
        { error: `Validation error: ${errorDetails}` },
        { status: 400 }
      );
    }

    const quotation = await parseQuotationWithOllama(validationResult.data);

    return NextResponse.json({
      success: true,
      quotation,
    });
  } catch (error: any) {
    console.error('Error in parse-quotation route handler:', error);
    const message = error?.message || 'An unexpected error occurred while parsing the quotation.';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
