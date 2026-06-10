import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker explicitly
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

export const extractTextFromPdf = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
  const pdf = await loadingTask.promise;

  const promises: Promise<string>[] = [];
  let completedPages = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    promises.push(
      (async () => {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');

        if (onProgress) {
          completedPages++;
          onProgress(Math.round((completedPages / pdf.numPages) * 100));
        }

        return pageText;
      })()
    );
  }

  const pagesText = await Promise.all(promises);

  return pagesText;
};
