// File: lib/embeddings.js
import axios from 'axios';

// กำหนดค่า endpoint สำหรับ embedding
const EMBEDDING_ENDPOINT = process.env.LMSTUDIO_EMBEDDING_ENDPOINT || 'http://localhost:1234/v1/embeddings';
const API_KEY = process.env.LMSTUDIO_API_KEY || 'lm-studio';

// แบ่งข้อความเป็นชิ้นเล็กๆ สำหรับการทำ embeddings
export function chunkText(text, maxChunkSize = 300, overlap = 50) {
  if (!text || typeof text !== 'string') {
    console.error('Invalid text for chunking:', text);
    return ['No valid text to process'];
  }
  
  // ตัดคำโดยใช้ช่องว่าง
  const words = text.split(/\s+/);
  const chunks = [];
  
  // ถ้ามีคำน้อยกว่า maxChunkSize ให้ใช้ทั้งหมด
  if (words.length <= maxChunkSize) {
    return [text];
  }
  
  // แบ่งข้อความเป็นชิ้นๆ
  for (let i = 0; i < words.length; i += (maxChunkSize - overlap)) {
    if (i > 0) i -= overlap; // ทำให้เกิดการซ้อนทับ
    const chunk = words.slice(i, i + maxChunkSize).join(' ');
    
    // เพิ่มเฉพาะ chunk ที่มีเนื้อหา
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
    
    if (i + maxChunkSize >= words.length) break;
  }
  
  console.log(`Created ${chunks.length} chunks from ${words.length} words`);
  return chunks;
}

// สร้าง embeddings จากข้อความ
export async function createEmbeddings(textChunks) {
  if (!textChunks || !Array.isArray(textChunks) || textChunks.length === 0) {
    console.error('Invalid text chunks:', textChunks);
    throw new Error('Invalid text chunks for embedding');
  }

  try {
    const embeddings = [];
    
    // สร้าง axios instance กับ timeout ที่มากพอ
    const axiosInstance = axios.create({
      timeout: 60000, // 60 วินาที
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    // ประมวลผลทีละ chunk เพื่อหลีกเลี่ยงการ timeout
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`Creating embedding for chunk ${i+1}/${textChunks.length}`);
      
      try {
        const response = await axiosInstance.post(
          EMBEDDING_ENDPOINT,
          {
            input: chunk,
            model: "embedding-model"
          }
        );
        
        // ตรวจสอบค่าที่ได้รับจาก API
        if (response.data?.data?.[0]?.embedding) {
          embeddings.push(response.data.data[0].embedding);
        } else {
          console.error('Invalid embedding response structure:', response.data);
          // สร้าง dummy embedding ขนาด 1536 มิติ แทนค่าที่ไม่ถูกต้อง
          embeddings.push(new Array(1536).fill(0));
        }
      } catch (chunkError) {
        console.error(`Error creating embedding for chunk ${i+1}:`, chunkError.message);
        // ใส่ embedding ว่างเพื่อรักษาลำดับ
        embeddings.push(new Array(1536).fill(0));
      }
      
      // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ส่งคำขอถี่เกินไป
      if (i < textChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error creating embeddings:', error);
    throw error;
  }
}

// อ่านไฟล์และแปลงเป็น embeddings
export async function processAndCreateEmbeddings(fileContent) {
  try {
    if (!fileContent) {
      throw new Error('No file content provided');
    }
    
    const textChunks = chunkText(fileContent);
    console.log(`Created ${textChunks.length} chunks from file content`);
    
    const embeddings = await createEmbeddings(textChunks);
    
    if (embeddings.length !== textChunks.length) {
      console.warn(`Warning: Number of embeddings (${embeddings.length}) does not match number of chunks (${textChunks.length})`);
    }
    
    return { textChunks, embeddings };
  } catch (error) {
    console.error('Error processing file for embeddings:', error);
    throw error;
  }
}

// สร้าง mock embeddings เพื่อใช้ในกรณีที่เชื่อมต่อกับ API ไม่ได้
export function createMockEmbeddings(count = 1) {
  const mockEmbeddings = [];
  const dimension = 1536; // ขนาดมาตรฐานของ embedding 
  
  for (let i = 0; i < count; i++) {
    // สร้าง embedding dummy
    const embedding = new Array(dimension).fill(0).map(() => Math.random() * 0.1);
    mockEmbeddings.push(embedding);
  }
  
  return mockEmbeddings;
}