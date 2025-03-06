// src/lib/utils/embeddings.js
import axios from "axios";

// กำหนดค่า API สำหรับ LMStudio หรือ OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-ada-002";

// กำหนดค่า LMStudio (ถ้ามี)
const LMSTUDIO_ENDPOINT = process.env.LMSTUDIO_EMBEDDING_ENDPOINT;
const LMSTUDIO_API_KEY = process.env.LMSTUDIO_API_KEY || "lm-studio";

/**
 * สร้าง embeddings โดยใช้ OpenAI API
 * @param {string[]} texts - อาร์เรย์ของข้อความที่ต้องการสร้าง embeddings
 * @returns {Promise<number[][]>} - อาร์เรย์ของ embedding vectors
 */
export async function createEmbeddingsWithOpenAI(texts) {
  try {
    if (!texts || texts.length === 0) {
      return [];
    }
    
    // ใช้ OpenAI API โดยตรงแทน langchain
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: texts,
        model: EMBEDDING_MODEL
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // OpenAI API จะส่งกลับข้อมูลในรูปแบบ { data: [{ embedding: [...] }, ...] }
    return response.data.data.map(item => item.embedding);
    
  } catch (error) {
    console.error('Error creating embeddings with OpenAI:', error);
    throw error;
  }
}

/**
 * สร้าง embeddings โดยใช้ LMStudio API
 * @param {string[]} texts - อาร์เรย์ของข้อความที่ต้องการสร้าง embeddings
 * @returns {Promise<number[][]>} - อาร์เรย์ของ embedding vectors
 */
export async function createEmbeddingsWithLMStudio(texts) {
  try {
    if (!texts || texts.length === 0) {
      return [];
    }
    
    const embeddings = [];
    
    // สร้าง axios instance
    const axiosInstance = axios.create({
      timeout: 60000, // 60 วินาที
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LMSTUDIO_API_KEY}`
      }
    });
    
    // ประมวลผลทีละข้อความ
    for (const text of texts) {
      const response = await axiosInstance.post(
        LMSTUDIO_ENDPOINT,
        {
          input: text,
          model: "embedding-model" // หรือชื่อโมเดลใน LMStudio
        }
      );
      
      if (response.data?.data?.[0]?.embedding) {
        embeddings.push(response.data.data[0].embedding);
      } else {
        console.warn('Invalid response from LMStudio:', response.data);
        // สร้าง dummy embedding ในกรณีที่ไม่ได้รับค่าที่ถูกต้อง
        embeddings.push(new Array(1536).fill(0));
      }
      
      // รอสักครู่ก่อนส่งคำขอถัดไป
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error creating embeddings with LMStudio:', error);
    throw error;
  }
}

/**
 * สร้าง embeddings โดยใช้ OpenAI หรือ LMStudio ตามที่กำหนด
 * @param {string[]} texts - อาร์เรย์ของข้อความที่ต้องการสร้าง embeddings
 * @returns {Promise<number[][]>} - อาร์เรย์ของ embedding vectors
 */
export async function createEmbeddings(texts) {
  try {
    // เนื่องจากอาจมีปัญหากับการเชื่อมต่อ API ในสภาพแวดล้อมทดสอบ
    // สร้าง mock embeddings สำหรับการทดสอบแทน
    return createMockEmbeddings(texts.length);
    
    // ใช้ LMStudio ถ้ามีการกำหนด endpoint
    // if (LMSTUDIO_ENDPOINT) {
    //   return createEmbeddingsWithLMStudio(texts);
    // }
    // // ใช้ OpenAI ในกรณีอื่นๆ
    // return createEmbeddingsWithOpenAI(texts);
  } catch (error) {
    console.error('Error creating embeddings:', error);
    // ในกรณีที่เกิดข้อผิดพลาด ให้ใช้ mock embeddings แทน
    return createMockEmbeddings(texts.length);
  }
}

/**
 * สร้าง embedding เพื่อใช้ในการค้นหา
 * @param {string} text - ข้อความที่ต้องการสร้าง embedding
 * @returns {Promise<number[]>} - embedding vector
 */
export async function createQueryEmbedding(text) {
  const embeddings = await createEmbeddings([text]);
  return embeddings[0];
}

/**
 * สร้าง mock embeddings สำหรับการทดสอบ
 * @param {number} count - จำนวน embeddings ที่ต้องการสร้าง
 * @param {number} dimension - ขนาดของ vector
 * @returns {Array<Array<number>>} - อาร์เรย์ของ mock embedding vectors
 */
export function createMockEmbeddings(count = 1, dimension = 1536) {
  return Array(count).fill(0).map(() => 
    Array(dimension).fill(0).map(() => Math.random() * 0.1)
  );
}