// File: lib/pdf-extractor.js
import * as pdfjsLib from 'pdfjs-dist';

// ตั้งค่า PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ฟังก์ชันตรวจสอบว่าเป็นไฟล์ PDF หรือไม่
export function isPDF(content) {
  // ตรวจสอบว่าเป็น blob หรือ buffer และเริ่มต้นด้วย %PDF หรือไม่
  if (content instanceof Blob || content instanceof ArrayBuffer || Buffer.isBuffer(content)) {
    const header = new Uint8Array(content.slice(0, 5));
    const headerStr = String.fromCharCode.apply(null, header);
    return headerStr.startsWith('%PDF');
  }
  
  // ถ้าเป็น string
  if (typeof content === 'string') {
    return content.trim().startsWith('%PDF');
  }
  
  return false;
}

// ฟังก์ชันดึงข้อความจากไฟล์ PDF
export async function extractTextFromPDF(pdfData) {
  try {
    // ถ้าเป็นข้อความ เราต้องแปลงเป็น Uint8Array ก่อน
    let data = pdfData;
    if (typeof pdfData === 'string') {
      const encoder = new TextEncoder();
      data = encoder.encode(pdfData);
    }
    
    // โหลดเอกสาร PDF
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let extractedText = '';
    
    // วนลูปอ่านทุกหน้า
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items;
      
      // รวมข้อความจากทุก item
      let lastY = null;
      for (const item of textItems) {
        if (lastY !== item.transform[5] && lastY !== null) {
          extractedText += '\n'; // ขึ้นบรรทัดใหม่เมื่อตำแหน่ง Y เปลี่ยน
        }
        extractedText += item.str;
        lastY = item.transform[5];
      }
      extractedText += '\n\n'; // เพิ่มบรรทัดว่างระหว่างหน้า
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "ไม่สามารถอ่านไฟล์ PDF นี้ได้ กรุณาใช้ไฟล์ข้อความแทน";
  }
}

// ฟังก์ชันเตรียมเนื้อหาสำหรับการทำ embedding
export async function prepareContentForEmbedding(content) {
  try {
    // ตรวจสอบว่าเป็น PDF หรือไม่
    if (isPDF(content)) {
      console.log('Detected PDF content, extracting text...');
      const extractedText = await extractTextFromPDF(content);
      
      // หากตัวอักษรต่ำกว่า 50 ตัว ถือว่าการสกัดข้อความไม่สำเร็จ
      if (extractedText.length < 50) {
        throw new Error("ไม่สามารถดึงข้อความจาก PDF ได้เพียงพอ");
      }
      
      return extractedText;
    }
    
    // ถ้าไม่ใช่ PDF ใช้เนื้อหาเดิม
    return content;
  } catch (error) {
    console.error('Error preparing content:', error);
    // ใช้เนื้อหาเดิมหากมีข้อผิดพลาด แต่บันทึกลงล็อก
    return content;
  }
}