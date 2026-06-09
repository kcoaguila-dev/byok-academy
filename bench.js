import { pipeline } from '@xenova/transformers';

async function run() {
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: false,
  });

  const chunks = Array(50).fill("This is a test chunk to measure embedding generation performance.");

  // Sequential
  console.log("Running sequential...");
  const startSeq = performance.now();
  const docsSeq = [];
  for (const chunk of chunks) {
    const output = await extractor(chunk, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    docsSeq.push({ text: chunk, embedding });
  }
  const endSeq = performance.now();
  console.log(`Sequential took: ${endSeq - startSeq} ms`);

  // Parallel
  console.log("Running parallel...");
  const startPar = performance.now();
  const docsPar = await Promise.all(
    chunks.map(async (chunk) => {
      const output = await extractor(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      return { text: chunk, embedding };
    })
  );
  const endPar = performance.now();
  console.log(`Parallel took: ${endPar - startPar} ms`);
}

run();
