import type { IntelData } from './types';

export function stripCitations(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, '$1').trim();
  }
  if (Array.isArray(value)) {
    return value.map(stripCitations);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripCitations(v)])
    );
  }
  return value;
}

export function extractJSON(content: unknown[]): IntelData {
  const textBlocks = content
    .filter((b: unknown) => (b as { type: string }).type === 'text')
    .map((b: unknown) => ((b as { text: string }).text || '').trim());

  if (textBlocks.length === 0) throw new Error('No text content in API response');

  for (let i = textBlocks.length - 1; i >= 0; i--) {
    const text = textBlocks[i];
    try { return JSON.parse(text) as IntelData; } catch { /* continue */ }
    const code = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (code) { try { return JSON.parse(code[1]) as IntelData; } catch { /* continue */ } }
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) { try { return JSON.parse(obj[0]) as IntelData; } catch { /* continue */ } }
  }
  throw new Error('Model did not return valid JSON. Try running again.');
}

export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
