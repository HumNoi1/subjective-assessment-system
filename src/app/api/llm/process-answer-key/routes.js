// app/api/llm/process-answer-key/route.js
import { splitDocument, storeDocumentEmbeddings } from '@/lib/langchain/documentProcessor';
import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { answerKeyId, content } = await request.json();
    
    // ดึงข้อมูลของ answer key จาก Supabase
    const { data: answerKey, error } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: 'Answer key not found' }, { status: 404 });
    }
    
    // แบ่งเอกสารเป็น chunks
    const documents = await splitDocument(content);
    
    // เพิ่ม metadata
    const metadata = {
      answer_key_id: answerKeyId,
      subject_id: answerKey.subject_id,
      term_id: answerKey.term_id,
    };
    
    // บันทึก embeddings
    await storeDocumentEmbeddings(documents, 'answer_key_embeddings', metadata);
    
    // อัปเดตสถานะในฐานข้อมูล
    await supabase
      .from('answer_keys')
      .update({ is_processed: true })
      .eq('answer_key_id', answerKeyId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing answer key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}