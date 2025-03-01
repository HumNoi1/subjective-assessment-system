// src/app/embeddings/answer-key/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';
import { createEmbeddings } from '@/lib/llm';

export async function POST(request) {
  try {
    const { answerKeyId, recreate = false } = await request.json();
    
    if (!answerKeyId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID ของไฟล์เฉลย' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // ดึงข้อมูลไฟล์เฉลย
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();
    
    if (answerKeyError) {
      return NextResponse.json(
        { error: answerKeyError.message },
        { status: 400 }
      );
    }
    
    // ตรวจสอบว่ามี embeddings อยู่แล้วหรือไม่
    const milvusClient = await getMilvusClient();
    
    if (recreate) {
      // ลบ embeddings เก่า (ถ้ามี)
      await milvusClient.delete({
        collection_name: 'answer_key_embeddings',
        filter: `answer_key_id == ${answerKeyId}`
      });
    } else {
      // ตรวจสอบว่ามี embeddings อยู่แล้วหรือไม่
      const searchResults = await milvusClient.search({
        collection_name: 'answer_key_embeddings',
        filter: `answer_key_id == ${answerKeyId}`,
        limit: 1
      });
      
      if (searchResults.results.length > 0) {
        return NextResponse.json({ 
          message: 'Embeddings มีอยู่แล้วสำหรับไฟล์เฉลยนี้',
          exists: true,
          count: searchResults.results.length
        });
      }
    }
    
    // แบ่งเนื้อหาเป็นส่วนๆ (chunking)
    const chunks = chunkText(answerKeyData.content, 1000, 200); // ขนาด 1000 ตัวอักษร, ซ้อนกัน 200 ตัวอักษร
    
    // สร้าง embeddings และบันทึกใน Milvus
    const embeddingsPromises = chunks.map(async (chunk, index) => {
      const embedding = await createEmbeddings(chunk);
      
      return {
        answer_key_id: answerKeyId,
        content_chunk: chunk,
        embedding: embedding,
        metadata: JSON.stringify({
          file_name: answerKeyData.file_name,
          subject_id: answerKeyData.subject_id,
          term_id: answerKeyData.term_id,
          chunk_index: index
        })
      };
    });
    
    const embeddingsData = await Promise.all(embeddingsPromises);
    
    // บันทึกลงใน Milvus
    await milvusClient.insert({
      collection_name: 'answer_key_embeddings',
      fields_data: embeddingsData
    });
    
    // อัพเดทสถานะใน Supabase ว่ามี embeddings แล้ว
    await supabase
      .from('answer_keys')
      .update({ 
        has_embeddings: true,
        embeddings_count: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq('answer_key_id', answerKeyId);
    
    return NextResponse.json({ 
      message: 'สร้าง embeddings สำหรับไฟล์เฉลยสำเร็จ',
      chunks_count: chunks.length
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ฟังก์ชันแบ่งข้อความเป็นส่วนๆ
function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.slice(startIndex, endIndex));
    startIndex = endIndex - overlap;
    
    // ถ้า chunk ถัดไปจะสั้นเกินไป ให้หยุด
    if (startIndex + chunkSize - overlap >= text.length) {
      break;
    }
  }
  
  return chunks;
}