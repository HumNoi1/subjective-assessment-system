import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subjectId = formData.get('subjectId');
    const termId = formData.get('termId');
    
    if (!file || !subjectId || !termId) {
      return NextResponse.json(
        { error: 'Missing required information' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Create a safe filename
    const timestamp = Date.now();
    const originalName = file.name;
    const safeFileName = `${timestamp}_${originalName.replace(/[^\x00-\x7F]/g, '')}`;
    const filePath = `answers/${safeFileName}`;
    
    // Get file as ArrayBuffer (works for both text and binary files)
    const fileBuffer = await file.arrayBuffer();
    const fileArray = new Uint8Array(fileBuffer);
    
    // Upload file to Supabase Storage
    console.log('Uploading file to path:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileArray, {
        contentType: file.type,
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload error details:', uploadError);
      return NextResponse.json({ error: 'File upload failed', details: uploadError }, { status: 400 });
    }
    
    // Create public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData.publicUrl;
    
    // IMPORTANT CHANGE: For PDFs, we don't try to extract content
    // Instead, we store a placeholder in the content field
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .insert([
        { 
          file_name: originalName,
          file_path: filePath,
          file_url: publicUrl,
          file_size: file.size,
          // Use placeholder for content instead of actual file content
          content: `[Binary file stored at ${filePath}]`,  
          subject_id: subjectId,
          term_id: termId,
          milvus_collection_name: 'answer_key_embeddings',
          has_embeddings: false
        }
      ])
      .select();
    
    if (answerKeyError) {
      console.error('Database error:', answerKeyError);
      return NextResponse.json({ error: 'Database error', details: answerKeyError }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'File uploaded successfully',
      answerKey: answerKeyData[0]
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}