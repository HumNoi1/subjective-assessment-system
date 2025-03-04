// File: lib/storage.js
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// อัปโหลดไฟล์เฉลยของอาจารย์
export async function uploadSolutionFile(file, teacherId, assignmentId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${teacherId}/${assignmentId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('teacher_solutions')
      .upload(filePath, file);

    if (error) throw error;

    // สร้าง URL สำหรับการเข้าถึงไฟล์
    const { data: urlData } = supabase.storage
      .from('teacher_solutions')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      name: file.name,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading solution file:', error);
    throw error;
  }
}

// อัปโหลดไฟล์งานของนักเรียน
export async function uploadSubmissionFile(file, teacherId, assignmentId, studentId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${teacherId}/${assignmentId}/${studentId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('student_submissions')
      .upload(filePath, file);

    if (error) throw error;

    // สร้าง URL สำหรับการเข้าถึงไฟล์
    const { data: urlData } = supabase.storage
      .from('student_submissions')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      name: file.name,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading submission file:', error);
    throw error;
  }
}

// ดาวน์โหลดไฟล์
export async function getFileUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// ลบไฟล์
export async function deleteFile(bucket, filePath) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) throw error;
  return true;
}