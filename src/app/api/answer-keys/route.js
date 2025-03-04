// src/app/api/answer-keys/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createEmbeddings } from '@/lib/llm';
import { getMilvusClient } from '@/lib/milvus';
import { extractTextFromPDF } from '@/lib/pdf';
import { createDocumentFromText, createIndexWithChunks } from '@/lib/llamaindex';
import { setCache } from '@/lib/cache';

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
          has_embeddings: false, // จะอัปเดตเป็น true หลังจากสร้าง embeddings
          llamaindex_processed: false // จะอัปเดตเป็น true หลังจากประมวลผลด้วย LlamaIndex
        }
      ])
      .select();
    
    if (answerKeyError) {
      console.error('Database error:', answerKeyError);
      return NextResponse.json({ error: 'Database error', details: answerKeyError }, { status: 400 });
    }
    
    const answerKeyId = answerKeyData[0].answer_key_id;
    
    // ประมวลผลด้วย LlamaIndex และสร้าง embeddings พร้อมกัน
    try {
      // 1. สร้าง LlamaIndex document และ index
      const metadata = {
        answerKeyId: answerKeyId,
        fileName: originalName,
        subjectId: subjectId,
        termId: termId
      };
      
      // สร้าง Index จากเนื้อหาแบบแบ่ง chunks
      const index = await createIndexWithChunks(fileContent, metadata, 1000, 200);
      
      // เก็บ Index ไว้ใน cache
      const cacheKey = `answer_key_index_${answerKeyId}`;
      setCache(cacheKey, index);
      
      // 2. สร้าง embeddings สำหรับ Milvus (ยังคงใช้ Milvus เพื่อความเข้ากันได้กับระบบเดิม)
      const chunks = fileContent.length > 1000 
        ? fileContent.match(/.{1,1000}/g) 
        : [fileContent];
      
      if (chunks && chunks.length > 0) {
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
        
        // อัพเดทสถานะทั้ง has_embeddings และ llamaindex_processed เป็น true
        await supabase
          .from('answer_keys')
          .update({ 
            has_embeddings: true,
            embeddings_count: embeddingsData.length,
            llamaindex_processed: true,
            updated_at: new Date().toISOString()
          })
          .eq('answer_key_id', answerKeyId);
        
        // อัพเดตข้อมูลที่จะส่งกลับ
        answerKeyData[0].has_embeddings = true;
        answerKeyData[0].embeddings_count = embeddingsData.length;
        answerKeyData[0].llamaindex_processed = true;
      }
    } catch (processingError) {
      console.error('Error processing with LlamaIndex and creating embeddings:', processingError);
      // บันทึกสถานะว่าการประมวลผลล้มเหลว
      await supabase
        .from('answer_keys')
        .update({ 
          processing_error: processingError.message,
          updated_at: new Date().toISOString()
        })
        .eq('answer_key_id', answerKeyId);
      
      // ยังคงส่งการอัปโหลดสำเร็จ แต่แจ้งว่าการประมวลผลล้มเหลว
      answerKeyData[0].processing_error = processingError.message;
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

// ดึงรายการไฟล์เฉลยทั้งหมด
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const termId = searchParams.get('termId');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('answer_keys')
      .select('*, subjects(subject_name), terms(term_name)')
      .order('created_at', { ascending: false });
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    
    if (termId) {
      query = query.eq('term_id', termId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ answerKeys: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}