// src/lib/llamaindex.js
import { Document } from "llamaindex/legacy";
import { VectorStoreIndex } from "llamaindex/legacy";
import { serviceContextFromDefaults, ServiceContext } from "llamaindex/legacy";
import { getCache, setCache } from "./cache";
import { createEmbeddings } from "./llm";

// กำหนดค่า LlamaIndex แบบกำหนดเอง (customized)
let serviceContext = null;

// ฟังก์ชันสำหรับเตรียม Service Context
export async function getServiceContext() {
  if (!serviceContext) {
    // สร้าง custom embedding function ที่ใช้ฟังก์ชัน createEmbeddings ที่มีอยู่แล้ว
    const embedFn = async (texts) => {
      // รองรับทั้งกรณีที่ texts เป็น array และไม่ใช่ array
      const textArray = Array.isArray(texts) ? texts : [texts];
      const embeddings = await Promise.all(textArray.map(text => createEmbeddings(text)));
      return embeddings;
    };

    // ตั้งค่า service context แบบกำหนดเอง
    serviceContext = serviceContextFromDefaults({
      embedModel: { getTextEmbedding: embedFn },
      // LLM จะถูกตั้งค่าอัตโนมัติจาก OpenAI client ที่มีในโปรเจค
    });
  }
  
  return serviceContext;
}

// ฟังก์ชันสำหรับสร้าง document จากข้อความ
export function createDocumentFromText(text, metadata = {}) {
  return new Document({ text, metadata });
}

// ฟังก์ชันสำหรับสร้าง index จาก documents
export async function createIndexFromDocuments(documents) {
  const context = await getServiceContext();
  return await VectorStoreIndex.fromDocuments(documents, { serviceContext: context });
}

// ฟังก์ชันสำหรับดึงและสร้าง index จากไฟล์เฉลย
export async function getAnswerKeyIndex(answerKeyId) {
  try {
    // ลองดึงข้อมูลจาก cache ก่อน
    const cacheKey = `answer_key_index_${answerKeyId}`;
    const cachedIndex = getCache(cacheKey);
    if (cachedIndex) {
      return cachedIndex;
    }

    // เริ่มกระบวนการดึงข้อมูลไฟล์เฉลยจาก Supabase
    const { createServerClient } = await import('./supabase');
    const supabase = await createServerClient();
    
    const { data: answerKeyData, error } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch answer key: ${error.message}`);
    }

    // สร้าง document จากเนื้อหาไฟล์เฉลย
    const document = createDocumentFromText(answerKeyData.content, {
      answerKeyId: answerKeyData.answer_key_id,
      fileName: answerKeyData.file_name,
      subjectId: answerKeyData.subject_id,
      termId: answerKeyData.term_id
    });

    // สร้าง index จาก document
    const index = await createIndexFromDocuments([document]);

    // บันทึกลง cache เพื่อใช้งานในอนาคต
    setCache(cacheKey, index);

    return index;
  } catch (error) {
    console.error('Error creating answer key index:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับ query คำตอบนักเรียนกับไฟล์เฉลย
export async function queryAnswerKey(answerKeyId, query, numResults = 3) {
  try {
    const index = await getAnswerKeyIndex(answerKeyId);
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({
      query: query,
    });

    return {
      response: response.response,
      sourceNodes: response.sourceNodes
    };
  } catch (error) {
    console.error('Error querying answer key:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับ query ใน RAG แบบสมบูรณ์
export async function queryAnswerKeyForAssessment(studentAnswer, answerKeyId) {
  try {
    const index = await getAnswerKeyIndex(answerKeyId);
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({
      query: `เนื้อหาในคำตอบของนักเรียนนี้สอดคล้องกับเนื้อหาใดในเฉลย: "${studentAnswer}"`,
    });

    // ดึงข้อมูลไฟล์เฉลยจาก Supabase เพื่อใช้ประกอบการประเมิน
    const { createServerClient } = await import('./supabase');
    const supabase = await createServerClient();
    
    const { data: answerKeyData, error } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch answer key: ${error.message}`);
    }

    return {
      relevantContent: response.response,
      sourceNodes: response.sourceNodes,
      fullAnswerKey: answerKeyData.content
    };
  } catch (error) {
    console.error('Error querying for assessment:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับ chunk ข้อความยาว
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided for chunking:', text);
    return [];
  }
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.slice(startIndex, endIndex));
    startIndex = endIndex - overlap;
    
    // If next chunk would be too small, stop
    if (startIndex + chunkSize - overlap >= text.length) {
      break;
    }
  }
  
  return chunks;
}

// ฟังก์ชันสำหรับการสร้าง index ด้วย chunking
export async function createIndexWithChunks(text, metadata = {}, chunkSize = 1000, overlap = 200) {
  try {
    const chunks = chunkText(text, chunkSize, overlap);
    const documents = chunks.map((chunk, i) => 
      createDocumentFromText(chunk, { ...metadata, chunkIndex: i })
    );
    
    return await createIndexFromDocuments(documents);
  } catch (error) {
    console.error('Error creating chunked index:', error);
    throw error;
  }
}