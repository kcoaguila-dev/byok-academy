export const chunkText = (text: string, maxChunkSize: number = 500, overlap: number = 50): string[] => {
  const chunks: string[] = [];

  if (!text || text.trim().length === 0) return chunks;

  // 1. Split on sentence boundaries first: split on '. ', '! ', '? ', '\n\n'
  const sentences = text.split(/(?<=\. )|(?<=! )|(?<=\? )|(?<=\n\n)/);

  let currentChunkSentences: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (sentence.length === 0) continue;

    // 3. When adding the next sentence would exceed maxChunkSize, close the current chunk and start a new one
    if (currentLength + sentence.length > maxChunkSize && currentChunkSentences.length > 0) {
      const trimmed = currentChunkSentences.join("").trim();
      if (trimmed.length > 0) {
        chunks.push(trimmed);
      }

      // 4. Apply overlap by repeating the last overlap characters (or last sentence, whichever is smaller)
      const lastSentence = currentChunkSentences[currentChunkSentences.length - 1];

      if (lastSentence.length <= overlap && (lastSentence.length + sentence.length <= maxChunkSize)) {
        currentChunkSentences = [lastSentence];
        currentLength = lastSentence.length;
      } else {
        currentChunkSentences = [];
        currentLength = 0;
      }
    }

    currentChunkSentences.push(sentence);
    currentLength += sentence.length;
  }

  if (currentChunkSentences.length > 0) {
    const finalChunk = currentChunkSentences.join("").trim();
    if (finalChunk.length > 0) {
      if (chunks.length === 0 || chunks[chunks.length - 1] !== finalChunk) {
        chunks.push(finalChunk);
      }
    }
  }

  return chunks;
};
