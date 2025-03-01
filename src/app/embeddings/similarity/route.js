// src/app/embeddings/similarity/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';
import { createEmbeddings } from '@/lib/llm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentAnswerId = searchParams.get('studentAnswerId');
    const answerKeyId = searchParams.get('answerKeyId');
    const limit = parseInt(searchParams.get('limit') || '5');
    
    if (!studentAnswerId || !answerKeyId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ ID ของคำตอบนักเรียนและไฟล์เฉลย' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // ดึงข้อมูลคำตอบนักเรียน
    const { data: studentAnswerData, error: studentAnswerError } = await supabase
      .from('student_answers')
      .select('*')
      .eq('student_answer_id', studentAnswerId)
      .single();
    
    if (studentAnswerError) {
      return NextResponse.json(
        { error: studentAnswerError.message },
        { status: 400 }
      );
    }
    
    // ตรวจสอบว่ามี embeddings ของคำตอบนักเรียนหรือไม่
    const milvusClient = await getMilvusClient();
    let studentAnswerEmbedding;
    
    const studentEmbeddingSearch = await milvusClient.search({
      collection_name: 'student_answer_embeddings',
      filter: `student_answer_id == ${studentAnswerId}`,
      limit: 1
    });
    
    if (studentEmbeddingSearch.results.length === 0) {
      // สร้าง embedding ใหม่
      studentAnswerEmbedding = await createEmbeddings(studentAnswerData.content);
    } else {
      // ใช้ embedding ที่มีอยู่แล้ว
      studentAnswerEmbedding = studentEmbeddingSearch.results[0].embedding;
    }
    
    // ค้นหาส่วนที่เกี่ยวข้องของเฉลยด้วย vector similarity
    const searchResults = await milvusClient.search({
      collection_name: 'answer_key_embeddings',
      vector: studentAnswerEmbedding,
      filter: `answer_key_id == ${answerKeyId}`,
      output_fields: ['content_chunk', 'metadata'],
      limit: limit,
    });
    
    // จัดรูปแบบผลลัพธ์
    const results = searchResults.results.map(result => ({
      content: result.content_chunk,
      score: result.score,
      metadata: JSON.parse(result.metadata)
    }));
    
    // คำนวณคะแนนความคล้ายคลึงโดยรวม
    const averageSimilarity = results.reduce((sum, item) => sum + item.score, 0) / results.length;
    
    return NextResponse.json({ 
      results,
      averageSimilarity,
      count: results.length
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}