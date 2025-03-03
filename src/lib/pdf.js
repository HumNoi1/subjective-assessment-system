// src/lib/pdf.js
import * as pdfjs from 'pdfjs-dist';

/**
 * Extract text from a PDF file
 * @param {ArrayBuffer} pdfBuffer - The PDF file as an ArrayBuffer
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromPDF(pdfBuffer) {
  try {
    // กำหนด worker แบบปลอดภัยสำหรับ Next.js server-side
    if (!globalThis.pdfjsWorkerLoaded) {
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
      globalThis.pdfjsWorkerLoaded = true;
    }
    
    // Load the PDF document
    const pdf = await pdfjs.getDocument({data: pdfBuffer}).promise;
    
    let extractedText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Join items with proper spacing
      let lastY = null;
      let lastItem = null;
      const PAGE_TEXT = textContent.items.reduce((text, item) => {
        // Check if we need to add a new line
        if (lastItem && lastY !== null) {
          const currentY = item.transform[5]; // Y position of the current item
          // If Y position changed significantly, add a new line
          if (Math.abs(currentY - lastY) > 5) {
            text += '\n';
          } else if (lastItem.str && !lastItem.str.endsWith(' ')) {
            // Add space between items on same line if needed
            text += ' ';
          }
        }
        
        lastY = item.transform[5];
        lastItem = item;
        text += item.str;
        return text;
      }, '');
      
      extractedText += PAGE_TEXT + '\n\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "ไม่สามารถแปลงไฟล์ PDF ได้: " + error.message;
  }
}