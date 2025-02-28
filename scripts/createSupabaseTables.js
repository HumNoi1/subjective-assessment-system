// scripts/createSupabaseTables.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log('Creating tables...');
  
  // สร้างตารางอาจารย์
  const { error: teachersError } = await supabase.rpc('create_teachers_table');
  if (teachersError) {
    console.error('Error creating teachers table:', teachersError);
    return;
  }
  
  // สร้างตารางชั้นเรียน
  const { error: classesError } = await supabase.rpc('create_classes_table');
  if (classesError) {
    console.error('Error creating classes table:', classesError);
    return;
  }
  
  // สร้างตารางนักเรียน
  const { error: studentsError } = await supabase.rpc('create_students_table');
  if (studentsError) {
    console.error('Error creating students table:', studentsError);
    return;
  }
  
  // สร้างตารางอื่นๆ ตามลำดับที่ถูกต้อง
  const tableCreationFunctions = [
    'create_terms_table',
    'create_subjects_table',
    'create_subject_term_table',
    'create_folders_table',
    'create_answer_keys_table',
    'create_student_answers_table',
    'create_assessments_table',
    'create_llm_usage_logs_table'
  ];
  
  for (const func of tableCreationFunctions) {
    const { error } = await supabase.rpc(func);
    if (error) {
      console.error(`Error in ${func}:`, error);
      return;
    }
    console.log(`Successfully executed ${func}`);
  }
  
  // สร้าง Vector Embeddings Extension
  const { error: pgvectorError } = await supabase.rpc('create_vector_extension');
  if (pgvectorError) {
    console.error('Error creating pgvector extension:', pgvectorError);
    return;
  }
  
  // สร้างตาราง Embeddings
  const embedTables = [
    'create_answer_key_embeddings_table',
    'create_student_answer_embeddings_table'
  ];
  
  for (const func of embedTables) {
    const { error } = await supabase.rpc(func);
    if (error) {
      console.error(`Error in ${func}:`, error);
      return;
    }
    console.log(`Successfully executed ${func}`);
  }
  
  console.log('All tables created successfully!');
}

createTables().catch(console.error);