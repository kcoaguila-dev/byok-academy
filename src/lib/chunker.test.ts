import { describe, it, expect } from 'vitest';
import { chunkText } from './chunker';

describe('chunkText', () => {
  it('should return empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('should not chunk if text is within max size', () => {
    const text = 'This is a short text.';
    const result = chunkText(text, 50);
    expect(result).toEqual(['This is a short text.']);
  });

  it('should split into chunks by double newline if exceeding max size', () => {
    const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
    // Total length is around 40 characters. Let's set max size to 15.
    // 'Paragraph 1.' = 12 chars
    // 'Paragraph 1.\n\n' = 14 chars
    const result = chunkText(text, 15);

    // The currentChunk behavior is:
    // P1 -> currentChunk becomes "Paragraph 1.\n\n" (len: 14)
    // P2 -> "Paragraph 1.\n\n".length + "Paragraph 2.".length = 14 + 12 = 26 > 15
    // So P1 is pushed, currentChunk becomes "Paragraph 2.\n\n"

    expect(result).toEqual([
      'Paragraph 1.',
      'Paragraph 2.',
      'Paragraph 3.'
    ]);
  });

  it('should trim whitespace from chunks', () => {
    const text = '   Paragraph 1.   \n\n   Paragraph 2.   ';
    const result = chunkText(text, 20);
    expect(result).toEqual([
      'Paragraph 1.',
      'Paragraph 2.'
    ]);
  });

  it('should combine smaller paragraphs into a single chunk if they fit', () => {
    const text = 'P1.\n\nP2.\n\nP3.';
    const result = chunkText(text, 15);
    // P1. (3) + \n\n (2) + P2. (3) = 8 < 15
    // P1.\n\nP2.\n\n (10) + P3. (3) = 13 < 15
    expect(result).toEqual(['P1.\n\nP2.\n\nP3.']);
  });

  it('should handle paragraphs that individually exceed the max size gracefully', () => {
    // The current logic simply pushes it, even if single paragraph > maxChunkSize
    const text = 'This is a very long paragraph that will definitely exceed the limit.';
    const result = chunkText(text, 10);
    expect(result).toEqual(['This is a very long paragraph that will definitely exceed the limit.']);
  });
});
