export const chunkText = (text: string, maxChunkSize: number = 500, overlap: number = 50): string[] => {
  const chunks: string[] = [];

  if (!text || text.length === 0) return chunks;

  if (text.length <= maxChunkSize) {
      chunks.push(text);
      return chunks;
  }

  let i = 0;
  while (i < text.length) {
      const chunk = text.substring(i, i + maxChunkSize);
      chunks.push(chunk);
      i += maxChunkSize - overlap;
  }

  return chunks;
};
