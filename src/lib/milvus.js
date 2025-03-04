// src/lib/milvus.js
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

let milvusClient;

export async function getMilvusClient() {
  if (!milvusClient) {
    try {
      // ตรวจสอบว่ามีการตั้งค่าตัวแปรสภาพแวดล้อมหรือไม่
      const milvusAddress = process.env.MILVUS_ADDRESS || 'http://localhost:19530';
      
      milvusClient = new MilvusClient({
        address: milvusAddress,
      });
      console.log('Milvus client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Milvus client:', error);
      // สร้าง mock client สำหรับการทดสอบ
      milvusClient = createMockMilvusClient();
    }
  }
  return milvusClient;
}

// สร้าง mock client เพื่อให้ระบบสามารถทำงานได้ แม้ไม่มี Milvus
function createMockMilvusClient() {
  console.warn('Using mock Milvus client - vector functionality will be limited');
  return {
    createCollection: async () => ({ status: { error_code: 'Success', reason: 'Mock success' } }),
    hasCollection: async () => ({ status: { error_code: 'Success' }, value: true }),
    insert: async () => ({ status: { error_code: 'Success' }, inserted_count: 1 }),
    search: async () => ({ status: { error_code: 'Success' }, results: [] }),
    query: async () => ({ status: { error_code: 'Success' }, data: [] }),
    delete: async () => ({ status: { error_code: 'Success' }, deleted_count: 0 }),
    createIndex: async () => ({ status: { error_code: 'Success' } }),
  };
}

// สร้าง collection สำหรับ answer_key_embeddings
export async function createAnswerKeyCollection() {
  try {
    const client = await getMilvusClient();
    
    // ตรวจสอบว่ามี collection แล้วหรือไม่
    const hasCollection = await client.hasCollection({
      collection_name: 'answer_key_embeddings'
    });
    
    if (hasCollection.value) {
      console.log('Collection answer_key_embeddings already exists');
      return;
    }
    
    await client.createCollection({
      collection_name: 'answer_key_embeddings',
      fields: [
        {
          name: 'id',
          data_type: 5, // DataType.Int64
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'answer_key_id',
          data_type: 5, // DataType.Int64
        },
        {
          name: 'content_chunk',
          data_type: 21, // DataType.VarChar
          max_length: 65535,
        },
        {
          name: 'embedding',
          data_type: 101, // DataType.FloatVector
          dim: 1536, // OpenAI embeddings dimension
        },
        {
          name: 'metadata',
          data_type: 21, // DataType.VarChar
          max_length: 65535,
        }
      ],
    });
    
    // สร้าง index สำหรับการค้นหาแบบ vector similarity
    await client.createIndex({
      collection_name: 'answer_key_embeddings',
      field_name: 'embedding',
      index_name: 'answer_key_vector_idx',
      index_type: 'IVF_FLAT',
      metric_type: 'COSINE',
      params: { nlist: 1024 },
    });
    
    console.log('Created answer_key_embeddings collection successfully');
  } catch (error) {
    console.error('Error creating answer_key_embeddings collection:', error);
  }
}

// สร้าง collection สำหรับ student_answer_embeddings
export async function createStudentAnswerCollection() {
  try {
    const client = await getMilvusClient();
    
    // ตรวจสอบว่ามี collection แล้วหรือไม่
    const hasCollection = await client.hasCollection({
      collection_name: 'student_answer_embeddings'
    });
    
    if (hasCollection.value) {
      console.log('Collection student_answer_embeddings already exists');
      return;
    }
    
    await client.createCollection({
      collection_name: 'student_answer_embeddings',
      fields: [
        {
          name: 'id',
          data_type: 5, // DataType.Int64
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'student_answer_id',
          data_type: 5, // DataType.Int64
        },
        {
          name: 'content_chunk',
          data_type: 21, // DataType.VarChar
          max_length: 65535,
        },
        {
          name: 'embedding',
          data_type: 101, // DataType.FloatVector
          dim: 1536, // OpenAI embeddings dimension
        },
        {
          name: 'metadata',
          data_type: 21, // DataType.VarChar
          max_length: 65535,
        }
      ],
    });
    
    // สร้าง index สำหรับการค้นหาแบบ vector similarity
    await client.createIndex({
      collection_name: 'student_answer_embeddings',
      field_name: 'embedding',
      index_name: 'student_answer_vector_idx',
      index_type: 'IVF_FLAT',
      metric_type: 'COSINE',
      params: { nlist: 1024 },
    });
    
    console.log('Created student_answer_embeddings collection successfully');
  } catch (error) {
    console.error('Error creating student_answer_embeddings collection:', error);
  }
}

export async function initializeMilvus() {
  try {
    const client = await getMilvusClient();

    // สร้าง collection ที่จำเป็น
    await createAnswerKeyCollection();
    await createStudentAnswerCollection();

    console.log('Milvus collections initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Milvus collections:', error);
    return false;
  }
}