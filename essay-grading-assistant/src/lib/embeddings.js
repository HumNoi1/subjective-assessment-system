// File: lib/embeddings.js
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// ใช้ LMstudio หรือ OpenAI API สำหรับการทำ embeddings
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
    
    // กำหนด timeout ให้นานขึ้น
    const axiosInstance = axios.create({
      timeout: 60000 // 60 seconds
    });
    
    // ทำ embeddings ทีละ chunk
    for (const chunk of textChunks) {
      console.log(`Creating embedding for chunk: "${chunk.substring(0, 50)}..."`);
      
      try {
        const response = await axiosInstance.post(
          LMSTUDIO_ENDPOINT,
          {
            input: chunk,
            model: "embedding-model" // ปรับตามโมเดลที่ใช้ใน LMStudio
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LMSTUDIO_API_KEY}`
            }
          }
        );
        
        if (response.data && response.data.data && response.data.data[0] && response.data.data[0].embedding) {
          embeddings.push(response.data.data[0].embedding);
        } else {
          console.error('Invalid embedding response structure:', response.data);
          throw new Error('Invalid embedding response structure');
        }
      } catch (chunkError) {
        console.error(`Error processing chunk: ${chunkError.message}`);
        // ในกรณีที่ chunk นี้มีปัญหา ให้ใช้ embedding ว่าง
        const emptyEmbedding = new Array(1536).fill(0);
        embeddings.push(emptyEmbedding);
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
    const textChunks = chunkText(fileContent);
    console.log(`Created ${textChunks.length} chunks from file content`);
    
    const embeddings = await createEmbeddings(textChunks);
    return { textChunks, embeddings };
  } catch (error) {
    console.error('Error processing file for embeddings:', error);
    throw error;
  }
}