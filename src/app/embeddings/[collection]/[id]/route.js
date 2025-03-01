// src/app/embeddings/[collection]/[id]/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';

export async function DELETE(request, { params }) {
  try {
    const { collection, id } = params;
    
    if (!collection || !id) {
      return NextResponse.json(
        { error: 'กรุณาระบุคอลเลกชันและ ID' },
        { status: 400 }
      );
    }
    
    // ตรวจสอบว่าคอลเลกชันที่ระบุถูกต้อง
    if (!['answer_key_embeddings', 'student_answer_embeddings'].includes(collection)) {
      return NextResponse.json(
        { error: 'คอลเลกชันไม่ถูกต้อง (ต้องเป็น answer_key_embeddings หรือ student_answer_embeddings)' },
        { status: 400 }
      );
    }
    
    const milvusClient = await getMilvusClient();
    const supabase = await createServerClient();
    
    // ลบ embeddings จาก Milvus
    let filter;
    if (collection === 'answer_key_embeddings') {
      filter = `answer_key_id == ${id}`;
    } else {
      filter = `student_answer_id == ${id}`;
    }
    
    // ตรวจสอบว่ามี embeddings อยู่หรือไม่
    const searchResults = await milvusClient.search({
      collection_name: collection,
      filter: filter,
      limit: 1
    });
    
    if (searchResults.results.length === 0) {
      return NextResponse.json({ 
        message: 'ไม่พบ embeddings ที่ต้องการลบ',
        deleted: false
      });
    }
    
    // ลบ embeddings
    await milvusClient.delete({
      collection_name: collection,
      filter: filter
    });
    
    // อัพเดทสถานะใน Supabase
    if (collection === 'answer_key_embeddings') {
      await supabase
        .from('answer_keys')
        .update({ 
          has_embeddings: false,
          embeddings_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('answer_key_id', id);
    } else {
      await supabase
        .from('student_answers')
        .update({ 
          has_embeddings: false,
          updated_at: new Date().toISOString()
        })
        .eq('student_answer_id', id);
    }
    
    return NextResponse.json({ 
      message: `ลบ embeddings จากคอลเลกชัน ${collection} สำเร็จ`,
      deleted: true
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}