// File: lib/qdrant.js
import { QdrantClient } from '@qdrant/js-client-rest';

// เชื่อมต่อกับ Qdrant
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
  timeout: 10000, // เพิ่ม timeout
  headers: {
    // เพิ่ม headers สำหรับ authentication
    'Content-Type': 'application/json',
    'api-key': process.env.QDRANT_API_KEY
  }
});

// ตรวจสอบการเชื่อมต่อ
export async function checkConnection() {
  try {
    const res = await qdrantClient.getCollections();
    return { status: 'connected', collections: res };
  } catch (error) {
    console.error('Failed to connect to Qdrant:', error);
    return { status: 'error', message: error.message };
  }
}

// สร้าง Collection ถ้ายังไม่มี
export async function ensureCollections() {
  try {
    // ตรวจสอบว่ามี Collection อยู่แล้วหรือไม่
    const collections = await qdrantClient.listCollections();
    
    // สร้าง Collection สำหรับเฉลยถ้ายังไม่มี
    if (!collections.collections.find(c => c.name === 'solution_embeddings')) {
      console.log('Creating solution_embeddings collection');
      await qdrantClient.createCollection('solution_embeddings', {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        },
      });
    }

    // สร้าง Collection สำหรับคำตอบนักเรียนถ้ายังไม่มี
    if (!collections.collections.find(c => c.name === 'submission_embeddings')) {
      console.log('Creating submission_embeddings collection');
      await qdrantClient.createCollection('submission_embeddings', {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        },
      });
    }

    return { status: 'success' };
  } catch (error) {
    console.error('Error ensuring collections:', error);
    return { status: 'error', message: error.message };
  }
}

// เพิ่มฟังก์ชันตรวจสอบความถูกต้องของ vector
function isValidVector(vector) {
  return Array.isArray(vector) && 
         vector.length === 1536 && 
         vector.every(val => typeof val === 'number' && !isNaN(val));
}

// สร้าง Embedding และบันทึกลงใน Qdrant
export async function insertSolutionEmbeddings(solutionId, assignmentId, teacherId, textChunks, embeddings) {
  try {
    // ตรวจสอบว่า collection มีอยู่หรือไม่
    await ensureCollections();

    // ตรวจสอบขนาดของข้อมูล
    if (textChunks.length !== embeddings.length) {
      console.error(`Text chunks length (${textChunks.length}) does not match embeddings length (${embeddings.length})`);
      // แก้ไขโดยใช้เฉพาะส่วนที่จับคู่กันได้
      const minLength = Math.min(textChunks.length, embeddings.length);
      textChunks = textChunks.slice(0, minLength);
      embeddings = embeddings.slice(0, minLength);
    }

    if (textChunks.length === 0) {
      return { status: 'warning', message: 'No text chunks to process' };
    }

    // สร้าง points สำหรับ Qdrant
    const points = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      // ตรวจสอบ vector
      if (!isValidVector(embeddings[i])) {
        console.warn(`Skipping invalid vector at index ${i}`);
        continue;
      }
      
      try {
        // ทำความสะอาดข้อความ
        let safeChunk = typeof textChunks[i] === 'string' 
          ? textChunks[i].replace(/[\x00-\x1F\x7F-\x9F]/g, '')
          : 'Invalid text';
          
        // จำกัดความยาว
        safeChunk = safeChunk.substring(0, 8000);
        
        points.push({
          id: `${solutionId}_${i}`,
          vector: embeddings[i],
          payload: {
            solution_id: solutionId,
            assignment_id: assignmentId,
            teacher_id: teacherId,
            content_chunk: safeChunk
          }
        });
      } catch (err) {
        console.error(`Error processing point at index ${i}:`, err);
      }
    }

    // ถ้าไม่มี points ที่ใช้งานได้
    if (points.length === 0) {
      return { status: 'warning', message: 'No valid points to insert' };
    }

    // ทำการบันทึกทีละจุดเพื่อหลีกเลี่ยงปัญหา batch insert
    let successCount = 0;
    
    for (const point of points) {
      try {
        await qdrantClient.upsert('solution_embeddings', {
          points: [point]
        });
        successCount++;
      } catch (pointError) {
        console.error(`Error inserting point ${point.id}:`, pointError);
      }
    }

    return {
      status: successCount > 0 ? 'success' : 'error',
      count: successCount,
      total: points.length
    };
  } catch (error) {
    console.error('Error inserting solution embeddings:', error);
    return { status: 'error', message: error.message };
  }
}

// ค้นหาคำตอบที่คล้ายกับเฉลย
export async function searchSimilarSubmissions(assignmentId, queryEmbedding, limit = 5) {
  try {
    const searchResult = await qdrantClient.search('submission_embeddings', {
      vector: queryEmbedding,
      filter: {
        must: [
          {
            key: 'assignment_id',
            match: {
              value: assignmentId,
            },
          },
        ],
      },
      limit: limit,
    });

    return searchResult;
  } catch (error) {
    console.error('Error searching similar submissions:', error);
    return { status: 'error', message: error.message };
  }
}

// ลบข้อมูล embedding ทั้งหมดของเฉลย
export async function deleteSolutionEmbeddings(solutionId) {
  try {
    const res = await qdrantClient.delete('solution_embeddings', {
      filter: {
        must: [
          {
            key: 'solution_id',
            match: {
              value: solutionId,
            },
          },
        ],
      },
    });

    return { status: 'success' };
  } catch (error) {
    console.error('Error deleting solution embeddings:', error);
    return { status: 'error', message: error.message };
  }
}

export default qdrantClient;