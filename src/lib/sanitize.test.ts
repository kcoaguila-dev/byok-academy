import { describe, it, expect } from 'vitest';
import { sanitizeInput } from './sanitize';

describe('sanitizeInput', () => {
  it('should return empty string for empty input', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should return normal string unchanged except for trimming', () => {
    expect(sanitizeInput('hello world')).toBe('hello world');
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });

  it('should replace backticks with single quotes', () => {
    expect(sanitizeInput('`hello`')).toBe("'hello'");
    expect(sanitizeInput('some `code` block')).toBe("some 'code' block");
  });

  it('should replace XML/HTML tags to prevent injection', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    expect(sanitizeInput('<hello>')).toBe('&lt;hello&gt;');
  });

  it('should remove non-printable control characters except newlines and tabs', () => {
    // \x00 (null byte), \x01-\x08, \x0B, \x0C, \x0E-\x1F, \x7F (DEL)
    const controlChars = '\x00\x01\x02\x07\x0B\x0C\x0E\x1F\x7F';
    const validChars = 'Valid\tText\nWith\rNewlines'; // Note: \r (\x0D) is not in the regex to remove!

    expect(sanitizeInput(`${controlChars}Hello`)).toBe('Hello');
    expect(sanitizeInput(validChars)).toBe('Valid\tText\nWith\rNewlines');
  });

  it('should handle complex inputs combining multiple scenarios', () => {
    const complexInput = `  <script>
      const a = \`test\x00\`;
    </script>  `;
    const expectedOutput = `&lt;script&gt;
      const a = 'test';
    &lt;/script&gt;`;

    expect(sanitizeInput(complexInput)).toBe(expectedOutput);
  });
});
