import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createEmbeddings } from '@/lib/llm';
import { getMilvusClient } from '@/lib/milvus';

// อัปโหลดไฟล์เฉลยใหม่
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subjectId = formData.get('subjectId');
    const termId = formData.get('termId');
    
    if (!file || !subjectId || !termId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    // อ่านเนื้อหาไฟล์
    const fileContent = await file.text();
    
    const supabase = await createServerClient();
    
    // บันทึกข้อมูลไฟล์เฉลยในตาราง answer_keys
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .insert([
        { 
          file_name: file.name,
          content: fileContent,
          file_size: file.size,
          subject_id: subjectId,
          term_id: termId,
          milvus_collection_name: 'answer_key_embeddings'
        }
      ])
      .select();
    
    if (answerKeyError) {
      return NextResponse.json(
        { error: answerKeyError.message },
        { status: 400 }
      );
    }
    
    const answerKeyId = answerKeyData[0].answer_key_id;
    
    // แบ่งเนื้อหาเป็นส่วนๆ (chunking)
    const chunks = chunkText(fileContent, 1000, 200); // ขนาด 1000 ตัวอักษร, ซ้อนกัน 200 ตัวอักษร
    
    // สร้าง embeddings และบันทึกใน Milvus
    for (const chunk of chunks) {
      const embedding = await createEmbeddings(chunk);
      
      const milvusClient = await getMilvusClient();
      await milvusClient.insert({
        collection_name: 'answer_key_embeddings',
        fields_data: [{
          answer_key_id: answerKeyId,
          content_chunk: chunk,
          embedding: embedding,
          metadata: JSON.stringify({
            file_name: file.name,
            subject_id: subjectId,
            term_id: termId
          })
        }]
      });
    }
    
    return NextResponse.json({ 
      message: 'อัปโหลดไฟล์เฉลยสำเร็จ',
      answerKey: answerKeyData[0]
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ดึงรายการไฟล์เฉลยทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const termId = searchParams.get('termId');
    
    const supabase = await createServerClient();
    
    let query = supabase.from('answer_keys').select('*');
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    
    if (termId) {
      query = query.eq('term_id', termId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ answerKeys: data });
    
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