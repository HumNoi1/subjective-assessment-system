import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMilvusClient } from '@/lib/milvus';
import { createEmbeddings } from '@/lib/llm';
import { extractTextFromPDF } from '@/lib/pdf';

export async function POST(request) {
  try {
    const { answerKeyId, recreate = false } = await request.json();
    
    if (!answerKeyId) {
      return NextResponse.json({ error: 'Answer key ID is required' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Get answer key data
    const { data: answerKeyData, error: answerKeyError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('answer_key_id', answerKeyId)
      .single();
    
    if (answerKeyError) {
      return NextResponse.json({ error: 'Answer key not found' }, { status: 400 });
    }
    
    // Check file type
    const fileExtension = answerKeyData.file_name.split('.').pop().toLowerCase();
    const isPDF = fileExtension === 'pdf';
    
    // Get file content
    let fileContent;
    
    if (isPDF) {
      // For PDFs, download the file and extract text
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(answerKeyData.file_path);
      
      if (fileError) {
        return NextResponse.json({ error: 'File download failed', details: fileError }, { status: 400 });
      }
      
      // Convert the downloaded file to ArrayBuffer
      const fileBuffer = await fileData.arrayBuffer();
      
      // Extract text from PDF
      fileContent = await extractTextFromPDF(fileBuffer);
      
      // Update the content in database with extracted text
      const { error: updateError } = await supabase
        .from('answer_keys')
        .update({ content: fileContent })
        .eq('answer_key_id', answerKeyId);
      
      if (updateError) {
        console.warn('Could not update content with extracted text:', updateError);
      }
    } else {
      // For non-PDF files, the content is already in the database
      fileContent = answerKeyData.content;
      
      // If content is a placeholder, download and read the file
      if (fileContent.startsWith('[Binary file stored at')) {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(answerKeyData.file_path);
        
        if (fileError) {
          return NextResponse.json({ error: 'File download failed', details: fileError }, { status: 400 });
        }
        
        fileContent = new TextDecoder('utf-8').decode(await fileData.arrayBuffer());
        
        // Update the content in database with actual text
        const { error: updateError } = await supabase
          .from('answer_keys')
          .update({ content: fileContent })
          .eq('answer_key_id', answerKeyId);
        
        if (updateError) {
          console.warn('Could not update content with file text:', updateError);
        }
      }
    }
    
    // Check if we need to delete existing embeddings
    const milvusClient = await getMilvusClient();
    
    if (recreate) {
      // Delete existing embeddings
      try {
        await milvusClient.delete({
          collection_name: 'answer_key_embeddings',
          filter: `answer_key_id == ${answerKeyId}`
        });
        console.log('Deleted existing embeddings');
      } catch (deleteError) {
        console.warn('Error deleting existing embeddings:', deleteError);
        // Continue anyway as the embeddings might not exist
      }
    } else {
      // Check if embeddings already exist
      try {
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
      } catch (searchError) {
        console.warn('Error checking for existing embeddings:', searchError);
        // Continue anyway as the collection might not exist yet
      }
    }
    
    // Break content into chunks
    const chunks = chunkText(fileContent, 1000, 200);
    
    if (chunks.length === 0) {
      return NextResponse.json({ 
        error: 'No content to create embeddings from', 
        details: 'The file may be empty or not contain extractable text'
      }, { status: 400 });
    }
    
    // Create embeddings for each chunk
    const embeddingsPromises = chunks.map(async (chunk, index) => {
      try {
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
      } catch (error) {
        console.error(`Error creating embedding for chunk ${index}:`, error);
        // Return null for failed embeddings
        return null;
      }
    });
    
    const embeddingsData = await Promise.all(embeddingsPromises);
    
    // Filter out failed embeddings
    const validEmbeddings = embeddingsData.filter(embedding => embedding !== null);
    
    if (validEmbeddings.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to create any valid embeddings', 
      }, { status: 500 });
    }
    
    // Insert embeddings into Milvus
    try {
      const insertResult = await milvusClient.insert({
        collection_name: 'answer_key_embeddings',
        fields_data: validEmbeddings
      });
      
      console.log('Inserted embeddings:', insertResult);
    } catch (insertError) {
      return NextResponse.json({ 
        error: 'Failed to insert embeddings into Milvus', 
        details: insertError.message
      }, { status: 500 });
    }
    
    // Update answer key status in database
    const { error: updateStatusError } = await supabase
      .from('answer_keys')
      .update({ 
        has_embeddings: true,
        embeddings_count: validEmbeddings.length,
        updated_at: new Date().toISOString()
      })
      .eq('answer_key_id', answerKeyId);
    
    if (updateStatusError) {
      console.warn('Could not update embedding status:', updateStatusError);
    }
    
    return NextResponse.json({ 
      message: 'Embeddings created successfully',
      chunks_count: chunks.length,
      embeddings_count: validEmbeddings.length
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// Utility function to break text into chunks
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