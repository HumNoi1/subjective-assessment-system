// File: lib/pdf-extractor.js
import { PDFDocument } from 'pdf-lib';

// ฟังก์ชันตรวจสอบว่าเป็นไฟล์ PDF หรือไม่
export function isPDF(content) {
  // ตรวจสอบว่าเริ่มต้นด้วย "%PDF" หรือไม่
  if (typeof content === 'string') {
    return content.trim().startsWith('%PDF');
  }
  
  // ถ้าเป็น ArrayBuffer หรือ Buffer
  if (content instanceof ArrayBuffer || Buffer.isBuffer(content)) {
    const firstBytes = new Uint8Array(content.slice(0, 5));
    const header = String.fromCharCode(...firstBytes);
    return header.startsWith('%PDF');
  }
  
  return false;
}

// ฟังก์ชันดึงข้อความจากไฟล์ PDF
export async function extractTextFromPDF(pdfContent) {
  try {
    // ถ้าเป็น PDF ให้ดึงข้อความเท่าที่ทำได้
    // (PDF-lib มีความสามารถจำกัดในการดึงข้อความ)
    // โค้ดนี้เป็นเพียงตัวอย่าง และอาจต้องใช้ library อื่น เช่น pdfjs-dist

    return "ไม่สามารถดึงข้อความจากไฟล์ PDF นี้ได้ กรุณาใช้ไฟล์ข้อความแทน";
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "เกิดข้อผิดพลาดในการแปลงไฟล์ PDF";
  }
}

// ฟังก์ชันเตรียมเนื้อหาสำหรับการทำ embedding
export async function prepareContentForEmbedding(content) {
  // ตรวจสอบว่าเป็น PDF หรือไม่
  if (isPDF(content)) {
    console.log('Detected PDF content, extracting text...');
    return await extractTextFromPDF(content);
  }
  
  // ถ้าไม่ใช่ PDF ให้ใช้เนื้อหาเดิม
  return content;
}