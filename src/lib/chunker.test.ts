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
    const result = chunkText(text, 15);
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
    expect(result).toEqual(['P1.\n\nP2.\n\nP3.']);
  });

  it('should handle paragraphs that individually exceed the max size gracefully', () => {
    const text = 'This is a very long paragraph that will definitely exceed the limit.';
    const result = chunkText(text, 10);
    expect(result).toEqual(['This is a very long paragraph that will definitely exceed the limit.']);
  });

  it('should not split mid-sentence when applying overlap', () => {
    const text = 'Sentence 1. Sentence 2. Sentence 3.';
    const result = chunkText(text, 30, 20);
    expect(result).toEqual([
      'Sentence 1. Sentence 2.',
      'Sentence 2. Sentence 3.'
    ]);
  });

  it('should handle different sentence boundaries correctly', () => {
    const text = 'Hey there! How are you? I am good.';
    const result = chunkText(text, 20, 10);
    expect(result).toEqual([
      'Hey there!',
      'How are you?',
      'I am good.'
    ]);
  });
});
