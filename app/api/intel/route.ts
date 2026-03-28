import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey || apiKey === 'your_key_here') {
    return NextResponse.json(
      { error: { message: 'PERPLEXITY_API_KEY is not configured. Add it to .env.local.' } },
      { status: 500 }
    );
  }

  let body: { system?: string; messages?: unknown[]; max_tokens?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 });
  }

  // Transform to Perplexity / OpenAI chat completions format
  const perplexityBody = {
    model: 'sonar-pro',
    messages: [
      { role: 'system', content: body.system || '' },
      ...(body.messages || []),
    ],
    max_tokens: body.max_tokens || 2000,
    temperature: 0.2, // low temp for consistent JSON output
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(perplexityBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: { message: data.error?.message || `Perplexity API error ${response.status}` } },
        { status: response.status }
      );
    }

    // Normalize to Anthropic-style content array so client code is unchanged
    const text: string = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Perplexity API error:', err);
    return NextResponse.json(
      { error: { message: 'Failed to reach Perplexity API' } },
      { status: 502 }
    );
  }
}
