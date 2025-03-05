// src/lib/utils/pdf-loader.js
// ใช้วิธีการที่ไม่ต้องพึ่ง PDF library จากภายนอก
import axios from 'axios';

/**
 * โหลดและแยกข้อความจากไฟล์ PDF
 * @param {Buffer|Blob} pdfBuffer - Buffer หรือ Blob ของไฟล์ PDF
 * @returns {Promise<string>} ข้อความทั้งหมดที่แยกได้จาก PDF
 */
export async function extractTextFromPdf(pdfBuffer) {
  // สำหรับเดโม เราทำให้ง่ายขึ้นโดยใช้เพียงการแปลงเป็นข้อความ
  try {
    // สมมติว่าเป็นข้อความหรือ Buffer ที่เข้ารหัสเป็น base64
    let text = '';
    
    if (pdfBuffer instanceof Buffer || pdfBuffer instanceof ArrayBuffer) {
      // ถ้าเป็น PDF จริงๆ เราอาจจะใช้ service ภายนอกในการแปลง
      // แต่เพื่อความง่ายในตัวอย่างนี้ เราจะสมมติว่าเป็นข้อความปกติ
      text = "นี่คือข้อความที่สกัดจาก PDF (จำลอง)";
    } else if (typeof pdfBuffer === 'string') {
      text = pdfBuffer;
    } else {
      text = "ไม่สามารถอ่านรูปแบบไฟล์นี้ได้";
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "เกิดข้อผิดพลาดในการสกัดข้อความจาก PDF";
  }
}

/**
 * เตรียมเนื้อหาสำหรับการทำ embedding
 * @param {Buffer|Blob|string} content - เนื้อหาไฟล์
 * @returns {Promise<string>} - เนื้อหาที่เตรียมพร้อมสำหรับการทำ embedding
 */
export async function prepareContentForEmbedding(content) {
  try {
    // ตรวจสอบว่าเป็น PDF หรือไม่
    if (isPDF(content)) {
      console.log('Detected PDF content, extracting text...');
      const extractedText = await extractTextFromPdf(content);
      return extractedText;
    }
    
    // ถ้าเป็น string ให้ใช้ค่าเดิม
    if (typeof content === 'string') {
      return content;
    }
    
    // ถ้าเป็น Buffer หรือ Blob ให้แปลงเป็น string
    if (content instanceof Buffer || content instanceof ArrayBuffer) {
      return new TextDecoder().decode(content);
    }
    
    return String(content);
  } catch (error) {
    console.error('Error preparing content:', error);
    return typeof content === 'string' ? content : 'ไม่สามารถแปลงเนื้อหาได้';
  }
}

/**
 * ตรวจสอบว่าเป็นไฟล์ PDF หรือไม่
 * @param {Buffer|Blob|string} content - เนื้อหาไฟล์ที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้าเป็น PDF, false ถ้าไม่ใช่
 */
export function isPDF(content) {
  // ตรวจสอบจาก Buffer หรือ Blob
  if (content instanceof Buffer || content instanceof ArrayBuffer) {
    const header = new Uint8Array(content.slice(0, 5));
    const headerStr = String.fromCharCode.apply(null, header);
    return headerStr.startsWith('%PDF');
  }
  
  // ตรวจสอบจาก String
  if (typeof content === 'string') {
    return content.trim().substring(0, 5) === '%PDF-';
  }
  
  // ตรวจสอบจาก Blob
  if (content instanceof Blob) {
    return content.type === 'application/pdf';
  }
  
  return false;
}