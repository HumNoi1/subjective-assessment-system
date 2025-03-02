import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';
import { createEmbeddings } from '@/lib/llm';
import { extractTextFromPDF } from '@/lib/pdf';

export async function POST(request) {
  try {
    const { answerKeyId, recreate = false } = await request.json();
    
    if (!answerKeyId) {
      return NextResponse.json(
        { error: 'Answer key ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // ดึงข้อมูลไฟล์เฉลย
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();
    
    if (answerKeyError) {
      return NextResponse.json(
        { error: 'Answer key not found' },
        { status: 400 }
      );
    }

    const fileExtension = answerKeyData.file_name.split('.').pop().toLowerCase();
    const isPDF = fileExtension === 'pdf';

    let fileContent;

    // Get file content
    if (isPDF) {
      // For PDFs, download the file and extract text
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(answerKeyData.file_path);
        
      if (fileError) {
        return NextResponse.json({ error: 'File download failed' }, { status: 400 });
      }

      // Convert the downloaded file to ArrayBuffer
      const fileBuffer = await fileData.arrayBuffer();

      // Extract text from PDF
      fileContent = await extractTextFromPDF(fileBuffer);
    } else {
      // FOr non-PDF files, the content is already in the database
      fileContent = answerKeyData.content;

      // If content is a placeholder, download and read the file
      if (fileContent.startWith('[Binary file stored at]')) {
        const ( data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(answerKeyData.file_path);
        
        if (fileError) {
          return NextResponse.json({ error: 'File download failed' }, { status: 400 });
        }

        fileContent = await fileData.text();
      }
    }
    
    // 1. ดาวน์โหลดไฟล์จาก Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(answerKeyData.file_path);
    
    if (fileError) {
      return NextResponse.json(
        { error: 'File download failed' },
        { status: 400 }
      );
    }
    
    // 2. แปลงไฟล์เป็นข้อความ
    const fileContent = await fileData.text();
    
    // 3. ตรวจสอบ Milvus embeddings
    const milvusClient = await getMilvusClient();
    
    if (recreate) {
      // ลบ embeddings เก่า
      await milvusClient.delete({
        collection_name: 'answer_key_embeddings',
        filter: `answer_key_id == ${answerKeyId}`
      });
    } else {
      // ตรวจสอบว่ามี embeddings อยู่แล้วหรือไม่
      const searchResults = await milvusClient.search({
        collection_name: 'answer_key_embeddings',
        filter: `answer_key_id == ${answerKeyId}`,
        limit: 1
      });
      
      if (searchResults.results.length > 0) {
        return NextResponse.json({ 
          message: 'Embeddings already exist',
          exists: true,
          count: searchResults.results.length
        });
      }
    }
    
    // 4. แบ่งเนื้อหาเป็นส่วนๆ (chunking)
    const chunks = chunkText(fileContent, 1000, 200);
    
    // 5. สร้าง embeddings และบันทึกใน Milvus
    const embeddingsPromises = chunks.map(async (chunk, index) => {
      const embedding = await createEmbeddings(chunk);
      
      return {
        answer_key_id: answerKeyId,
        content_chunk: chunk,
        embedding: embedding,
        metadata: JSON.stringify({
          file_name: answerKeyData.file_name,
          subject_id: answerKeyData.subject_id,
          term_id: answerKeyData.term_id,
          chunk_index: index
        })
      };
    });
    
    const embeddingsData = await Promise.all(embeddingsPromises);
    
    // บันทึกลงใน Milvus
    await milvusClient.insert({
      collection_name: 'answer_key_embeddings',
      fields_data: embeddingsData
    });
    
    // อัพเดทสถานะใน Supabase
    await supabase
      .from('answer_keys')
      .update({ 
        has_embeddings: true,
        embeddings_count: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq('answer_key_id', answerKeyId);
    
    return NextResponse.json({ 
      message: 'Embeddings created successfully',
      chunks_count: chunks.length
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    
    if (startIndex + chunkSize - overlap >= text.length) {
      break;
    }
  }
  
  return chunks;
}