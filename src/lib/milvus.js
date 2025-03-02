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

export async function initializeMilvus() {
  try {

    const client = await getMilvusClient();

    // สร้าง collection ที่จำเป็น
    await createAnswerKeyCollection
    await createStudentAnswerCollection

    console.log('Milvus collections initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Milvus collections:', error);
    return false;
  }
}

// ทดสอบ Milvus กับข้อความภาษาไทย
export async function testMilvusWithThaiText() {
  try {
    const client = await getMilvusClient();
    
    // ทดสอบข้อความภาษาไทย
    const thaiText = "ทดสอบภาษาไทยในฐานข้อมูล Milvus";
    
    // สร้าง collection ทดสอบถ้ายังไม่มี
    try {
      await client.createCollection({
        collection_name: 'thai_test',
        fields: [
          {
            name: 'id',
            data_type: 5, // DataType.Int64
            is_primary_key: true,
            autoID: true,
          },
          {
            name: 'text',
            data_type: 21, // DataType.VarChar
            max_length: 65535,
          }
        ],
      });
      console.log('Created test collection for Thai language');
    } catch (error) {
      // Collection อาจมีอยู่แล้ว
      console.log('Collection may already exist:', error.message);
    }
    
    // ทดสอบการเขียน
    const insertResult = await client.insert({
      collection_name: 'thai_test',
      fields_data: [{
        text: thaiText
      }]
    });
    
    console.log('Insert result:', insertResult);
    
    // ทดสอบการอ่าน
    const queryResult = await client.query({
      collection_name: 'thai_test',
      output_fields: ['text'],
      limit: 1
    });
    
    console.log('Query result:', queryResult);
    
    return {
      success: true,
      message: 'Milvus สามารถจัดการข้อความภาษาไทยได้',
      results: {
        insert: insertResult,
        query: queryResult
      }
    };
    
  } catch (error) {
    console.error('Error testing Milvus with Thai text:', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการทดสอบ Milvus กับข้อความภาษาไทย',
      error: error.message
    };
  }
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
  const client = await getMilvusClient();
  
  try {
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
  } catch (error) {
    // Handle collection already exists
    console.log('Collection setup error:', error.message);
  }
}