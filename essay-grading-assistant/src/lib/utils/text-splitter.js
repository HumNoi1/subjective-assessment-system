// src/lib/utils/text-splitter.js

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

    // แบ่งข้อความเป็นประโยคโดยใช้การแบ่งตามการขึ้นบรรทัดและการใช้เครื่องหมายวรรคตอน
    const sentences = text
      .replace(/([.?!])\s*(?=[A-Z])/g, "$1\n") // แบ่งประโยคเมื่อพบเครื่องหมาย .?! ที่ตามด้วยตัวพิมพ์ใหญ่
      .split(/\n+/) // แบ่งตามการขึ้นบรรทัด
      .filter(sentence => sentence.trim()); // กรองเอาแต่ประโยคที่มีข้อความ
      
    const chunks = [];
    let currentChunk = "";
    
    // วนลูปเพื่อสร้าง chunks
    for (const sentence of sentences) {
      // ถ้าเพิ่มประโยคนี้แล้ว chunk จะยาวเกินกำหนด ให้เก็บ chunk ปัจจุบันและเริ่ม chunk ใหม่
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // ถ้ามีการกำหนด overlap ให้เก็บส่วนท้ายของ chunk ก่อนหน้าไว้
        if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
          // ใช้ส่วนท้ายของ chunk ก่อนหน้าตามจำนวน overlap
          const lastWords = currentChunk.split(' ').slice(-Math.ceil(chunkOverlap / 5)); // ประมาณว่า 1 คำ = 5 ตัวอักษร
          currentChunk = lastWords.join(' ');
        } else {
          currentChunk = "";
        }
      }
      
      // เพิ่มประโยคเข้าไปใน chunk ปัจจุบัน
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
    
    // เพิ่ม chunk สุดท้าย (ถ้ามี)
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    // ในกรณีไม่มี chunks หรือข้อความสั้นเกินไป
    if (chunks.length === 0 && text.trim()) {
      return [text.trim()];
    }
    
    return chunks;
    
  } catch (error) {
    console.error('Error splitting text into chunks:', error);
    // ในกรณีที่เกิดข้อผิดพลาด ส่งคืนอาร์เรย์ที่มีข้อความทั้งหมดเป็นชิ้นเดียว
    return [text];
  }
}