export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  return input
    // Replace backticks to prevent markdown code block escapes
    .replace(/`/g, "'")
    // Replace XML/HTML tags to prevent XML block injection
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Remove non-printable control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
};

export const sanitizePromptInput = sanitizeInput;
