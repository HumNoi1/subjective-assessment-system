// File: lib/qdrant.js
// ใช้ HTTP client ธรรมดาแทน เนื่องจากมีปัญหากับ Qdrant client
import axios from 'axios';

// ตั้งค่า URL และ API key
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';

// สร้าง axios instance สำหรับเชื่อมต่อกับ Qdrant
const qdrantAxios = axios.create({
  baseURL: QDRANT_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(QDRANT_API_KEY ? { 'api-key': QDRANT_API_KEY } : {})
  },
  timeout: 15000 // 15 วินาที
});

// ตรวจสอบการเชื่อมต่อ
export async function checkConnection() {
  try {
    // เรียกใช้ API สำหรับดึงรายการ collections
    const response = await qdrantAxios.get('/collections');
    return { 
      status: 'connected', 
      collections: response.data 
    };
  } catch (error) {
    console.error('Failed to connect to Qdrant:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

// สร้าง Collection ถ้ายังไม่มี
export async function ensureCollections() {
  try {
    // ตรวจสอบ collections ที่มีอยู่
    const response = await qdrantAxios.get('/collections');
    const existingCollections = response.data.collections || [];
    const collectionNames = existingCollections.map(c => c.name);
    
    // สร้าง collection สำหรับเฉลย ถ้ายังไม่มี
    if (!collectionNames.includes('solution_embeddings')) {
      console.log('Creating solution_embeddings collection');
      await qdrantAxios.put('/collections/solution_embeddings', {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });
    }
    
    // สร้าง collection สำหรับงานนักเรียน ถ้ายังไม่มี
    if (!collectionNames.includes('submission_embeddings')) {
      console.log('Creating submission_embeddings collection');
      await qdrantAxios.put('/collections/submission_embeddings', {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });
    }
    
    return { 
      status: 'success',
      message: 'Collections created or verified'
    };
  } catch (error) {
    console.error('Error ensuring collections:', error.message);
    return { 
      status: 'error', 
      message: error.message
    };
  }
}

// ตรวจสอบความถูกต้องของ vector
function isValidVector(vector) {
  return Array.isArray(vector) && 
         vector.length === 1536 && 
         vector.every(val => typeof val === 'number' && !isNaN(val));
}

// บันทึกเฉลยลงใน Qdrant
export async function insertSolutionEmbeddings(solutionId, assignmentId, teacherId, textChunks, embeddings) {
  try {
    // สร้าง collection ถ้ายังไม่มี
    await ensureCollections();
    
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
      await deleteSolutionEmbeddings(solutionId);
    } catch (deleteError) {
      console.warn(`Warning while deleting old embeddings: ${deleteError.message}`);
    }
    
    // สร้าง points สำหรับ Qdrant
    const points = [];
    
    for (let i = 0; i < validChunks.length; i++) {
      if (!isValidVector(validEmbeddings[i])) {
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
        vector: validEmbeddings[i],
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
        await qdrantAxios.put('/collections/solution_embeddings/points?wait=true', {
          points: batch
        });
        successCount += batch.length;
      } catch (batchError) {
        console.error(`Error inserting batch:`, batchError.message);
        
        // ถ้า batch ไม่สำเร็จ ลองทีละจุด
        for (const point of batch) {
          try {
            await qdrantAxios.put('/collections/solution_embeddings/points?wait=true', {
              points: [point]
            });
            successCount++;
          } catch (pointError) {
            console.error(`Error inserting point ${point.id}:`, pointError.message);
          }
        }
      }
    }
    
    return {
      status: successCount > 0 ? 'success' : 'error',
      count: successCount,
      total: points.length
    };
  } catch (error) {
    console.error('Error inserting solution embeddings:', error.message);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

// ค้นหาคำตอบที่คล้ายกัน
export async function searchSimilarSubmissions(assignmentId, queryEmbedding, limit = 5) {
  try {
    const response = await qdrantAxios.post('/collections/submission_embeddings/points/search', {
      vector: queryEmbedding,
      filter: {
        must: [
          {
            key: 'assignment_id',
            match: {
              value: assignmentId
            }
          }
        ]
      },
      limit: limit
    });
    
    return response.data;
  } catch (error) {
    console.error('Error searching similar submissions:', error.message);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

// ลบข้อมูล embedding ของเฉลย
export async function deleteSolutionEmbeddings(solutionId) {
  try {
    const response = await qdrantAxios.post('/collections/solution_embeddings/points/delete', {
      filter: {
        must: [
          {
            key: 'solution_id',
            match: {
              value: solutionId
            }
          }
        ]
      }
    });
    
    return { 
      status: 'success', 
      deleted: response.data 
    };
  } catch (error) {
    console.error('Error deleting solution embeddings:', error.message);
    // ถ้าไม่มี collection ไม่ถือเป็นข้อผิดพลาด
    if (error.response && error.response.status === 404) {
      return { 
        status: 'success', 
        message: 'Collection not found, nothing to delete' 
      };
    }
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
    await ensureCollections();
    
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
      if (!isValidVector(validEmbeddings[i])) {
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
        vector: validEmbeddings[i],
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
        await qdrantAxios.put('/collections/submission_embeddings/points?wait=true', {
          points: batch
        });
        successCount += batch.length;
      } catch (batchError) {
        console.error(`Error inserting batch:`, batchError.message);
        
        // ถ้า batch ไม่สำเร็จ ลองทีละจุด
        for (const point of batch) {
          try {
            await qdrantAxios.put('/collections/submission_embeddings/points?wait=true', {
              points: [point]
            });
            successCount++;
          } catch (pointError) {
            console.error(`Error inserting point ${point.id}:`, pointError.message);
          }
        }
      }
    }
    
    return {
      status: successCount > 0 ? 'success' : 'error',
      count: successCount,
      total: points.length
    };
  } catch (error) {
    console.error('Error inserting submission embeddings:', error.message);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
}

// ส่งออก axios instance สำหรับใช้งานในที่อื่น
const qdrantAPI = {
  axios: qdrantAxios,
  checkConnection,
  ensureCollections,
  insertSolutionEmbeddings,
  insertSubmissionEmbeddings,
  searchSimilarSubmissions,
  deleteSolutionEmbeddings
};

export default qdrantAPI;