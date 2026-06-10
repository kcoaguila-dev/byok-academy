import { describe, it, expect, vi } from 'vitest';

// Mock pdfjs-dist before it's imported in the module under test
vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
    getDocument: vi.fn().mockImplementation(() => {
      return {
        promise: Promise.resolve({
          numPages: 3,
          getPage: vi.fn().mockImplementation((pageNum: number) => {
            // Add an artificial delay to test Promise.all concurrency
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  getTextContent: vi.fn().mockResolvedValue({
                    items: [{ str: `Page ${pageNum} text.` }],
                  }),
                });
              }, 10 * (3 - pageNum)); // Simulate out-of-order resolution
            });
          }),
        }),
      };
    }),
    version: '5.7.284',
  };
});

import { extractTextFromPdf } from './pdfParser';
import * as pdfjsLib from 'pdfjs-dist';

describe('pdfParser', () => {
  it('should extract text using Promise.all and return concatenated text in page order', async () => {
    // Create a dummy File object
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    // We expect it to resolve correctly and return pages in order
    // despite out-of-order timeout resolutions in the mock
    const pagesText = await extractTextFromPdf(file);

    expect(pdfjsLib.getDocument).toHaveBeenCalled();
    expect(pagesText).toEqual([
      'Page 1 text.',
      'Page 2 text.',
      'Page 3 text.',
    ]);
  });

  it('should handle progress callbacks if provided', async () => {
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const onProgress = vi.fn();

    await extractTextFromPdf(file, onProgress);

    // It should be called 3 times (once per page)
    expect(onProgress).toHaveBeenCalledTimes(3);

    // The last call should be 100% progress
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });
});
