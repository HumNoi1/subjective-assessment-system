// File: lib/embeddings.js
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// ใช้ LMStudio สำหรับการทำ embeddings
const LMSTUDIO_ENDPOINT = process.env.LMSTUDIO_EMBEDDING_ENDPOINT || 'http://localhost:8000/v1/embeddings';
const LMSTUDIO_API_KEY = process.env.LMSTUDIO_API_KEY || 'lm-studio';

// แบ่งข้อความเป็นชิ้นเล็กๆ สำหรับการทำ embeddings
export function chunkText(text, maxChunkSize = 300, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += (maxChunkSize - overlap)) {
    if (i > 0) i -= overlap;
    chunks.push(words.slice(i, i + maxChunkSize).join(' '));
    if (i + maxChunkSize >= words.length) break;
  }
  
  return chunks;
}

// สร้าง embeddings จากข้อความ
export async function createEmbeddings(textChunks) {
  try {
    const embeddings = [];
    
    // ทำ embeddings ทีละ chunk เพื่อความปลอดภัย
    for (const chunk of textChunks) {
      const response = await axios.post(
        LMSTUDIO_ENDPOINT,
        {
          input: chunk,
          model: "embedding-model", // ปรับตามโมเดลที่ใช้ใน LMStudio
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LMSTUDIO_API_KEY}`,
          },
        }
      );
      
      embeddings.push(response.data.data[0].embedding);
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
    const textChunks = chunkText(fileContent);
    const embeddings = await createEmbeddings(textChunks);
    return { textChunks, embeddings };
  } catch (error) {
    console.error('Error processing file for embeddings:', error);
    throw error;
  }
}