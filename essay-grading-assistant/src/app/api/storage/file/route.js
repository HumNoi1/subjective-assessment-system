// File: app/api/storage/file/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

// ลบไฟล์
export async function DELETE(request) {
  const { bucket, filePath } = await request.json();
  
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}