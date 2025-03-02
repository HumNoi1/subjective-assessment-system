import * as pdfjs from 'pdfjs-dist';

// Set up PDF.js worker
const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extract text from a PDF file
 * @param {ArrayBuffer} pdfBuffer - The PDF file as an ArrayBuffer
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromPDF(pdfBuffer) {
  try {
    // Load the PDF document
    const pdf = await pdfjs.getDocument({data: pdfBuffer}).promise;
    
    let extractedText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      extractedText += pageText + '\n\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}