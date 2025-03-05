// src/lib/utils/qdrant-client.js
import { QdrantClient } from "@qdrant/js-client-rest";

// กำหนดค่าเชื่อมต่อ Qdrant จาก environment variables
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';

// ชื่อ collections สำหรับเก็บข้อมูล
export const COLLECTIONS = {
  SOLUTIONS: 'teacher_solutions',
  SUBMISSIONS: 'student_submissions',
};

// ขนาดของ embedding vector (ขึ้นอยู่กับโมเดลที่ใช้)
export const VECTOR_SIZE = 1536; // สำหรับ OpenAI text-embedding-ada-002

// สร้าง Qdrant client instance
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  ...(QDRANT_API_KEY ? { apiKey: QDRANT_API_KEY } : {}),
});

/**
 * ตรวจสอบการเชื่อมต่อกับ Qdrant
 * @returns {Promise<{status: string, message?: string}>}
 */
export async function checkQdrantConnection() {
  try {
    // ทดลองเรียก API ของ Qdrant
    await qdrantClient.getCollections();
    return { status: 'connected' };
  } catch (error) {
    console.error('Failed to connect to Qdrant:', error);
    return { 
      status: 'error', 
      message: error.message
    };
  }
}

/**
 * สร้าง Collection ใน Qdrant ถ้ายังไม่มี
 * @param {string} collectionName - ชื่อ collection ที่ต้องการสร้าง
 * @returns {Promise<{status: string, message?: string}>}
 */
export async function createCollectionIfNotExists(collectionName) {
  try {
    // ตรวจสอบว่ามี collection นี้อยู่แล้วหรือไม่
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      // สร้าง collection ใหม่
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      });
      return { status: 'created', message: `Collection ${collectionName} created successfully` };
    }
    
    return { status: 'exists', message: `Collection ${collectionName} already exists` };
  } catch (error) {
    console.error(`Error creating collection ${collectionName}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * ลบ points ใน collection ตามเงื่อนไข filter
 * @param {string} collectionName - ชื่อ collection
 * @param {Object} filter - เงื่อนไขในการลบ points
 * @returns {Promise<{status: string, message?: string}>}
 */
export async function deletePointsByFilter(collectionName, filter) {
  try {
    const result = await qdrantClient.delete(collectionName, {
      filter: filter,
    });
    
    return { 
      status: 'success', 
      message: `Deleted ${result.status.operationId} points` 
    };
  } catch (error) {
    console.error(`Error deleting points from ${collectionName}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * อัปโหลด points เข้า collection
 * @param {string} collectionName - ชื่อ collection
 * @param {Array} points - points ที่ต้องการอัปโหลด
 * @returns {Promise<{status: string, message?: string}>}
 */
export async function upsertPoints(collectionName, points) {
  try {
    await qdrantClient.upsert(collectionName, {
      wait: true,
      points: points,
    });
    
    return { 
      status: 'success', 
      message: `Uploaded ${points.length} points to ${collectionName}` 
    };
  } catch (error) {
    console.error(`Error uploading points to ${collectionName}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * ค้นหา points ที่ใกล้เคียงกับ vector ที่กำหนด
 * @param {string} collectionName - ชื่อ collection
 * @param {Array<number>} vector - embedding vector ที่ต้องการค้นหา
 * @param {Object} filter - เงื่อนไขในการกรองผลลัพธ์
 * @param {number} limit - จำนวนผลลัพธ์สูงสุด
 * @returns {Promise<Array>} - ผลลัพธ์การค้นหา
 */
export async function searchSimilarVectors(collectionName, vector, filter, limit = 5) {
  try {
    const results = await qdrantClient.search(collectionName, {
      vector: vector,
      filter: filter,
      limit: limit,
    });
    
    return results;
  } catch (error) {
    console.error(`Error searching in ${collectionName}:`, error);
    throw error;
  }
}

// บันทึกเฉลยลงใน Qdrant
export async function insertSolutionEmbeddings(solutionId, assignmentId, teacherId, textChunks, embeddings) {
  try {
    // สร้าง collection ถ้ายังไม่มี
    await createCollectionIfNotExists(COLLECTIONS.SOLUTIONS);
    
    // ปรับปรุงให้ขนาดตรงกัน
    const minLength = Math.min(textChunks.length, embeddings.length);
    const validChunks = textChunks.slice(0, minLength);
    const validEmbeddings = embeddings.slice(0, minLength);
    
    if (validChunks.length === 0) {
      return { 
        status: 'warning', 
        message: 'No valid text chunks to process' 
      };
    }
    
    // ลบข้อมูลเก่าของเฉลยนี้ (ถ้ามี)
    try {
      await deletePointsByFilter(COLLECTIONS.SOLUTIONS, {
        must: [
          {
            key: 'solution_id',
            match: { value: solutionId }
          }
        ]
      });
    } catch (deleteError) {
      console.warn(`Warning while deleting old embeddings: ${deleteError.message}`);
    }
    
    // สร้าง points สำหรับ Qdrant
    const points = [];
    
    for (let i = 0; i < validChunks.length; i++) {
      // ตรวจสอบว่า vector ถูกต้องหรือไม่
      const vector = validEmbeddings[i];
      if (!Array.isArray(vector) || vector.length === 0) {
        console.warn(`Skipping invalid vector at index ${i}`);
        continue;
      }
      
      // ทำความสะอาดข้อความ
      let safeChunk = typeof validChunks[i] === 'string' 
        ? validChunks[i].replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        : 'Invalid text';
        
      // จำกัดความยาว
      safeChunk = safeChunk.substring(0, 3000);
      
      points.push({
        id: `${solutionId}_${i}`,
        vector: vector,
        payload: {
          solution_id: solutionId,
          assignment_id: assignmentId,
          teacher_id: teacherId,
          content_chunk: safeChunk,
          chunk_index: i
        }
      });
    }
    
    // ถ้าไม่มี points ที่ถูกต้อง
    if (points.length === 0) {
      return { 
        status: 'warning', 
        message: 'No valid points after processing' 
      };
    }
    
    // แบ่งเป็น batch เล็กๆ
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < points.length; i += batchSize) {
      batches.push(points.slice(i, i + batchSize));
    }
    
    // บันทึกทีละ batch
    let successCount = 0;
    for (const batch of batches) {
      try {
        await upsertPoints(COLLECTIONS.SOLUTIONS, batch);
        successCount += batch.length;
      } catch (batchError) {
        console.error(`Error inserting batch:`, batchError.message);
      }
    }
    
    return {
      status: successCount > 0 ? 'success' : 'error',
      count: successCount,
      total: points.length
    };
  } catch (error) {
    console.error('Error inserting solution embeddings:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

// เพิ่ม embedding สำหรับคำตอบนักเรียน
export async function insertSubmissionEmbeddings(submissionId, studentId, assignmentId, textChunks, embeddings) {
  try {
    // ตรวจสอบ collection
    await createCollectionIfNotExists(COLLECTIONS.SUBMISSIONS);
    
    // ปรับขนาดให้ตรงกัน
    const minLength = Math.min(textChunks.length, embeddings.length);
    const validChunks = textChunks.slice(0, minLength);
    const validEmbeddings = embeddings.slice(0, minLength);
    
    if (validChunks.length === 0) {
      return { 
        status: 'warning', 
        message: 'No valid text chunks to process' 
      };
    }
    
    // สร้าง points
    const points = [];
    for (let i = 0; i < validChunks.length; i++) {
      // ตรวจสอบว่า vector ถูกต้องหรือไม่
      const vector = validEmbeddings[i];
      if (!Array.isArray(vector) || vector.length === 0) {
        console.warn(`Skipping invalid vector at index ${i}`);
        continue;
      }
      
      // ทำความสะอาดข้อความ
      let safeChunk = typeof validChunks[i] === 'string'
        ? validChunks[i].replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        : 'Invalid text';
        
      // จำกัดความยาว
      safeChunk = safeChunk.substring(0, 3000);
      
      points.push({
        id: `${submissionId}_${i}`,
        vector: vector,
        payload: {
          submission_id: submissionId,
          student_id: studentId,
          assignment_id: assignmentId,
          content_chunk: safeChunk,
          chunk_index: i
        }
      });
    }
    
    if (points.length === 0) {
      return { 
        status: 'warning', 
        message: 'No valid points after processing' 
      };
    }
    
    // แบ่งเป็น batch
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < points.length; i += batchSize) {
      batches.push(points.slice(i, i + batchSize));
    }
    
    // บันทึกทีละ batch
    let successCount = 0;
    for (const batch of batches) {
      try {
        await upsertPoints(COLLECTIONS.SUBMISSIONS, batch);
        successCount += batch.length;
      } catch (batchError) {
        console.error(`Error inserting batch:`, batchError.message);
      }
    }
    
    return {
      status: successCount > 0 ? 'success' : 'error',
      count: successCount,
      total: points.length
    };
  } catch (error) {
    console.error('Error inserting submission embeddings:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

// ลบข้อมูล embedding ของเฉลย
export async function deleteSolutionEmbeddings(solutionId) {
  return await deletePointsByFilter(COLLECTIONS.SOLUTIONS, {
    must: [
      {
        key: 'solution_id',
        match: { value: solutionId }
      }
    ]
  });
}

// ส่งออก client ไปใช้งาน
export default qdrantClient;