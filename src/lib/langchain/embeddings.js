// lib/langchain/embeddings.js
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { supabase } from '../supabase/client';

// สร้าง instance ของ Embeddings model
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002', // หรือใช้โมเดลอื่นตามความเหมาะสม
});

// สร้าง Vector Store สำหรับเก็บ Embeddings
export const createVectorStore = async (tableName) => {
  return new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: tableName,
    queryName: 'match_documents',
  });
};