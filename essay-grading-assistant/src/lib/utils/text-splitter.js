// src/lib/utils/text-splitter.js
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

/**
 * แบ่งข้อความเป็นชิ้นเล็กๆ (chunks)
 * @param {string} text - ข้อความที่ต้องการแบ่ง
 * @param {number} chunkSize - ขนาดของแต่ละชิ้น (จำนวนตัวอักษร)
 * @param {number} chunkOverlap - จำนวนตัวอักษรที่ซ้อนทับกันระหว่างชิ้น
 * @returns {Promise<string[]>} อาร์เรย์ของชิ้นข้อความ
 */
export async function splitTextIntoChunks(text, chunkSize = 500, chunkOverlap = 50) {
  try {
    if (!text || typeof text !== 'string') {
      console.warn('Invalid text provided for splitting');
      return [];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", " ", ""], // ลำดับของตัวแบ่ง
    });
    
    const chunks = await splitter.createDocuments([text]);
    
    // แยกเอาเฉพาะเนื้อหาออกมาจาก Document objects
    return chunks.map(chunk => chunk.pageContent);
  } catch (error) {
    console.error('Error splitting text into chunks:', error);
    // ในกรณีที่เกิดข้อผิดพลาด ส่งคืนอาร์เรย์ที่มีข้อความทั้งหมดเป็นชิ้นเดียว
    return [text];
  }
}