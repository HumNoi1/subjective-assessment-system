// src/app/api/answer-keys/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createEmbeddings } from '@/lib/llm';
import { getMilvusClient } from '@/lib/milvus';
import { extractTextFromPDF } from '@/lib/pdf';

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
    
    // Extract text content based on file type
    let fileContent;
    const fileExtension = originalName.split('.').pop().toLowerCase();
    const isPDF = fileExtension === 'pdf';
    
    if (isPDF) {
      // Extract text from PDF
      fileContent = await extractTextFromPDF(fileBuffer);
    } else {
      // For text files, decode directly
      fileContent = new TextDecoder('utf-8').decode(fileArray);
    }
    
    // Save answer key information to database
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .insert([
        { 
          file_name: originalName,
          file_path: filePath,
          file_url: publicUrl,
          file_size: file.size,
          content: fileContent || `[Binary file stored at ${filePath}]`,
          subject_id: subjectId,
          term_id: termId,
          milvus_collection_name: 'answer_key_embeddings',
          has_embeddings: false // จะอัปเดตเป็น true หลังจากสร้าง embeddings
        }
      ])
      .select();
    
    if (answerKeyError) {
      console.error('Database error:', answerKeyError);
      return NextResponse.json({ error: 'Database error', details: answerKeyError }, { status: 400 });
    }
    
    // สร้าง embeddings อัตโนมัติหลังจากบันทึกข้อมูล
    try {
      const answerKeyId = answerKeyData[0].answer_key_id;
      
      // ตัดแบ่งเนื้อหาเป็นส่วน ๆ (chunks)
      const chunks = chunkText(fileContent, 1000, 200);
      
      if (chunks.length > 0) {
        // สร้าง embeddings สำหรับแต่ละ chunk
        const milvusClient = await getMilvusClient();
        const embeddingsPromises = chunks.map(async (chunk, index) => {
          const embedding = await createEmbeddings(chunk);
          return {
            answer_key_id: answerKeyId,
            content_chunk: chunk,
            embedding: embedding,
            metadata: JSON.stringify({
              file_name: originalName,
              subject_id: subjectId,
              term_id: termId,
              chunk_index: index
            })
          };
        });
        
        const embeddingsData = await Promise.all(embeddingsPromises);
        
        // บันทึก embeddings ลงใน Milvus
        await milvusClient.insert({
          collection_name: 'answer_key_embeddings',
          fields_data: embeddingsData
        });
        
        // อัพเดทสถานะ has_embeddings เป็น true
        await supabase
          .from('answer_keys')
          .update({ 
            has_embeddings: true,
            embeddings_count: embeddingsData.length,
            updated_at: new Date().toISOString()
          })
          .eq('answer_key_id', answerKeyId);
        
        // อัพเดตข้อมูลที่จะส่งกลับให้มี has_embeddings เป็น true
        answerKeyData[0].has_embeddings = true;
        answerKeyData[0].embeddings_count = embeddingsData.length;
      }
    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError);
      // ไม่ส่ง error กลับไปเพื่อให้การอัปโหลดไฟล์สำเร็จ แม้ว่าการสร้าง embeddings จะล้มเหลว
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

// Utility function ตัดแบ่งข้อความเป็นส่วน ๆ
function chunkText(text, chunkSize, overlap) {
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