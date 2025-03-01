import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// ดึงข้อมูลโฟลเดอร์เฉพาะ
export async function GET(request, { params }) {
  try {
    const { folderId } = params;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('folders')
      .select('*, teachers(name), subjects(subject_name)')
      .eq('folder_id', folderId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ folder: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// อัพเดทข้อมูลโฟลเดอร์
export async function PUT(request, { params }) {
  try {
    const { folderId } = params;
    const { folderName, subjectId } = await request.json();
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('folders')
      .update({ 
        folder_name: folderName,
        subject_id: subjectId
      })
      .eq('folder_id', folderId)
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'อัพเดทโฟลเดอร์สำเร็จ',
      folder: data[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ลบโฟลเดอร์
export async function DELETE(request, { params }) {
  try {
    const { folderId } = params;
    
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('folder_id', folderId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'ลบโฟลเดอร์สำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}