// src/app/api/answer-keys/[id]/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';

// ดึงข้อมูลไฟล์เฉลยเฉพาะ
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('answer_keys')
      .select('*, subjects(subject_name), terms(term_name)')
      .eq('answer_key_id', id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ answerKey: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// อัพเดทข้อมูลไฟล์เฉลย
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const formData = await request.formData();
    const file = formData.get('file');
    const subjectId = formData.get('subjectId');
    const termId = formData.get('termId');
    
    if (!subjectId || !termId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // เตรียมข้อมูลสำหรับอัพเดท
    const updateData = {
      subject_id: subjectId,
      term_id: termId,
      updated_at: new Date().toISOString()
    };
    
    // ถ้ามีการอัปโหลดไฟล์ใหม่
    if (file) {
      const fileContent = await file.text();
      
      updateData.file_name = file.name;
      updateData.content = fileContent;
      updateData.file_size = file.size;
      
      // อัพเดทข้อมูลใน Supabase
      const { data, error } = await supabase
        .from('answer_keys')
        .update(updateData)
        .eq('answer_key_id', id)
        .select();
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      // ลบ embeddings เก่าจาก Milvus
      const milvusClient = await getMilvusClient();
      await milvusClient.delete({
        collection_name: 'answer_key_embeddings',
        filter: `answer_key_id == ${id}`
      });
      
      // สร้าง embeddings ใหม่สำหรับไฟล์ที่อัพเดท
      // สร้าง chunks และ embeddings ตามต้องการ (คล้ายกับใน POST)
      // ...
      
      return NextResponse.json({ 
        message: 'อัพเดทไฟล์เฉลยและ embeddings สำเร็จ',
        answerKey: data[0]
      });
    } else {
      // กรณีไม่มีการอัพเดทไฟล์ เพียงแค่อัพเดทข้อมูลอื่น
      const { data, error } = await supabase
        .from('answer_keys')
        .update(updateData)
        .eq('answer_key_id', id)
        .select();
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ 
        message: 'อัพเดทข้อมูลไฟล์เฉลยสำเร็จ',
        answerKey: data[0]
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ลบไฟล์เฉลย
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const supabase = await createServerClient();
    const milvusClient = await getMilvusClient();
    
    // ลบ embeddings จาก Milvus ก่อน
    await milvusClient.delete({
      collection_name: 'answer_key_embeddings',
      filter: `answer_key_id == ${id}`
    });
    
    // ลบข้อมูลจาก Supabase
    const { error } = await supabase
      .from('answer_keys')
      .delete()
      .eq('answer_key_id', id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ message: 'ลบไฟล์เฉลยสำเร็จ' });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}