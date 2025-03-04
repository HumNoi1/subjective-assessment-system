// src/lib/initialize.js
import { initializeMilvus } from './milvus';
import { getServiceContext } from './llamaindex';
import { createServerClient } from './supabase';

export async function initializeSystem() {
  console.log('Initializing system...');
  
  try {
    // 1. เริ่มต้น Milvus
    const milvusInitialized = await initializeMilvus();
    if (!milvusInitialized) {
      console.error('Failed to initialize Milvus');
    }
    
    // 2. เริ่มต้น LlamaIndex
    await getServiceContext();
    console.log('LlamaIndex service context initialized');
    
    // 3. ตรวจสอบการเชื่อมต่อกับ Supabase
    try {
      const supabase = await createServerClient();
      const { count, error } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      console.log(`Supabase connection successful. Found ${count} teachers.`);
    } catch (supabaseError) {
      console.error('Failed to connect to Supabase:', supabaseError);
    }
    
    console.log('System initialization completed');
    return true;
  } catch (error) {
    console.error('System initialization failed:', error);
    return false;
  }
}

// ฟังก์ชันสำหรับตรวจสอบประเภทไฟล์จากชื่อไฟล์
export function getFileType(fileName) {
  if (!fileName) return 'unknown';
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'txt':
      return 'text';
    case 'csv':
      return 'csv';
    case 'xls':
    case 'xlsx':
      return 'excel';
    default:
      return 'unknown';
  }
}