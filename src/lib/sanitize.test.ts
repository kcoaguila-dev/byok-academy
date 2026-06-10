import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizePromptInput } from './sanitize';

describe('sanitizeInput', () => {
  it('handles empty input', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as any)).toBe('');
  });

  it('replaces backticks with single quotes', () => {
    expect(sanitizeInput('`code`')).toBe("'code'");
    expect(sanitizeInput('```javascript\nfoo\n```')).toBe("'''javascript\nfoo\n'''");
  });

  it('escapes XML/HTML tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });

  it('removes non-printable control characters but keeps newlines and tabs', () => {
    const inputWithControlChars = "hello\x00\x08world\n\ttest";
    expect(sanitizeInput(inputWithControlChars)).toBe('helloworld\n\ttest');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('   hello world   ')).toBe('hello world');
  });
});

describe('sanitizePromptInput', () => {
  it('wraps content in xml tags and triple backticks', () => {
    const result = sanitizePromptInput('my content', 'my_tag');
    expect(result).toBe('<my_tag>\n```\nmy content\n```\n</my_tag>');
  });

  it('uses default tag "input"', () => {
    const result = sanitizePromptInput('my content');
    expect(result).toBe('<input>\n```\nmy content\n```\n</input>');
  });

  it('sanitizes input before wrapping', () => {
    const result = sanitizePromptInput('`code` & <script>');
    expect(result).toBe('<input>\n```\n\'code\' & &lt;script&gt;\n```\n</input>');
  });

  it('returns empty string if sanitized output is empty', () => {
    expect(sanitizePromptInput('   ')).toBe('');
  });
});
