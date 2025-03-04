// File: lib/milvus.js
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// เชื่อมต่อกับ Milvus
const milvusClient = new MilvusClient({
  address: process.env.MILVUS_ADDRESS || 'localhost:19530',
  username: process.env.MILVUS_USERNAME,
  password: process.env.MILVUS_PASSWORD,
});

// ตรวจสอบการเชื่อมต่อ
export async function checkConnection() {
  try {
    const res = await milvusClient.listCollections();
    return { status: 'connected', collections: res };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// สร้าง Collection ถ้ายังไม่มี
export async function ensureCollections() {
  try {
    // ตรวจสอบว่ามี Collection อยู่แล้วหรือไม่
    const collections = await milvusClient.listCollections();
    
    // สร้าง Collection สำหรับเฉลยถ้ายังไม่มี
    if (!collections.collectionNames.includes('solution_embeddings')) {
      await milvusClient.createCollection({
        collection_name: 'solution_embeddings',
        fields: [
          {
            name: 'id',
            description: 'ID',
            data_type: 'VarChar',
            is_primary_key: true,
            max_length: 36,
          },
          {
            name: 'solution_id',
            description: 'Solution ID',
            data_type: 'VarChar',
            max_length: 36,
          },
          {
            name: 'assignment_id',
            description: 'Assignment ID',
            data_type: 'VarChar',
            max_length: 36,
          },
          {
            name: 'teacher_id',
            description: 'Teacher ID',
            data_type: 'VarChar',
            max_length: 36,
          },
          {
            name: 'content_chunk',
            description: 'Solution content chunk',
            data_type: 'VarChar',
            max_length: 65535,
          },
          {
            name: 'embedding',
            description: 'Vector embedding',
            data_type: 'FloatVector',
            dimension: 1536,
          },
        ],
      });
      
      // สร้าง Index
      await milvusClient.createIndex({
        collection_name: 'solution_embeddings',
        field_name: 'embedding',
        index_type: 'HNSW',
        metric_type: 'COSINE',
        params: { M: 8, efConstruction: 64 },
      });
    }
    
    // สร้าง Collection สำหรับคำตอบนักเรียนถ้ายังไม่มี
    if (!collections.collectionNames.includes('submission_embeddings')) {
      await milvusClient.createCollection({
        collection_name: 'submission_embeddings',
        fields: [
          {
            name: 'id',
            description: 'ID',
            data_type: 'VarChar',
            is_primary_key: true,
            max_length: 36,
          },
          {
            name: 'submission_id',
            description: 'Submission ID',
            data_type: 'VarChar',
            max_length: 36,
          },
          {
            name: 'student_id',
            description: 'Student ID',
            data_type: 'VarChar',
            max_length: 36,
          },
          {
            name: 'assignment_id',
            description: 'Assignment ID',
            data_type: 'VarChar',
            max_length: 36,
          },
          {
            name: 'content_chunk',
            description: 'Submission content chunk',
            data_type: 'VarChar',
            max_length: 65535,
          },
          {
            name: 'embedding',
            description: 'Vector embedding',
            data_type: 'FloatVector',
            dimension: 1536,
          },
        ],
      });
      
      // สร้าง Index
      await milvusClient.createIndex({
        collection_name: 'submission_embeddings',
        field_name: 'embedding',
        index_type: 'HNSW',
        metric_type: 'COSINE',
        params: { M: 8, efConstruction: 64 },
      });
    }
    
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// สร้าง Embedding และบันทึกลงใน Milvus
export async function insertSolutionEmbeddings(solutionId, assignmentId, teacherId, textChunks, embeddings) {
  try {
    await milvusClient.loadCollection({
      collection_name: 'solution_embeddings',
    });

    const entities = textChunks.map((chunk, index) => ({
      id: `${solutionId}_${index}`,
      solution_id: solutionId,
      assignment_id: assignmentId,
      teacher_id: teacherId,
      content_chunk: chunk,
      embedding: embeddings[index],
    }));

    const res = await milvusClient.insert({
      collection_name: 'solution_embeddings',
      data: entities,
    });

    return { status: 'success', count: res.insertCnt };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// สร้าง Embedding และบันทึกคำตอบนักเรียนลงใน Milvus
export async function insertSubmissionEmbeddings(submissionId, studentId, assignmentId, textChunks, embeddings) {
  try {
    await milvusClient.loadCollection({
      collection_name: 'submission_embeddings',
    });

    const entities = textChunks.map((chunk, index) => ({
      id: `${submissionId}_${index}`,
      submission_id: submissionId,
      student_id: studentId,
      assignment_id: assignmentId,
      content_chunk: chunk,
      embedding: embeddings[index],
    }));

    const res = await milvusClient.insert({
      collection_name: 'submission_embeddings',
      data: entities,
    });

    return { status: 'success', count: res.insertCnt };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// ค้นหาคำตอบที่คล้ายกับเฉลย
export async function searchSimilarSubmissions(assignmentId, queryEmbedding, limit = 5) {
  try {
    await milvusClient.loadCollection({
      collection_name: 'submission_embeddings',
    });

    const res = await milvusClient.search({
      collection_name: 'submission_embeddings',
      expr: `assignment_id == "${assignmentId}"`,
      vectors: [queryEmbedding],
      search_params: {
        anns_field: 'embedding',
        topk: limit,
        metric_type: 'COSINE',
        params: { ef: 64 },
      },
      output_fields: ['submission_id', 'student_id', 'content_chunk'],
    });

    return res.results;
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// ลบข้อมูล embedding ทั้งหมดของเฉลย
export async function deleteSolutionEmbeddings(solutionId) {
  try {
    await milvusClient.loadCollection({
      collection_name: 'solution_embeddings',
    });

    const res = await milvusClient.delete({
      collection_name: 'solution_embeddings',
      expr: `solution_id == "${solutionId}"`,
    });

    return { status: 'success', count: res.deleteCnt };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

export default milvusClient;