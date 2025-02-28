import { MilvusClient } from '@zilliz/milvus2-sdk-node';

let milvusClient;

export async function getMilvusClient() {
  if (!milvusClient) {
    milvusClient = new MilvusClient({
      address: process.env.MILVUS_ADDRESS,
      username: process.env.MILVUS_USERNAME,
      password: process.env.MILVUS_PASSWORD,
    });
  }
  return milvusClient;
}

// สร้าง collection สำหรับ answer_key_embeddings
export async function createAnswerKeyCollection() {
  const client = await getMilvusClient();
  
  try {
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
  } catch (error) {
    // Handle collection already exists
    console.log('Collection setup error:', error.message);
  }
}

// สร้าง collection สำหรับ student_answer_embeddings
export async function createStudentAnswerCollection() {
  // คล้ายกับฟังก์ชัน createAnswerKeyCollection แต่สำหรับ student_answer_embeddings
}