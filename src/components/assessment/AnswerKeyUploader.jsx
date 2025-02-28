// components/assessment/AnswerKeyUploader.jsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase/client';

export default function AnswerKeyUploader({ subjectId, termId }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  
  const onSubmit = async (data) => {
    try {
      setIsUploading(true);
      setMessage('กำลังอัปโหลดไฟล์...');
      
      // 1. อัปโหลดไฟล์ไปยัง Supabase Storage
      const file = data.answerKeyFile[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${subjectId}-${termId}-${Date.now()}.${fileExt}`;
      const filePath = `answer_keys/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // 2. อ่านเนื้อหาของไฟล์
      let content = '';
      
      if (fileExt === 'txt' || fileExt === 'md') {
        content = await file.text();
      } else {
        // สำหรับไฟล์ประเภทอื่นอาจต้องมีการแปลงข้อมูลเพิ่มเติม
        content = `File content needs to be extracted: ${fileName}`;
      }
      
      // 3. บันทึกข้อมูลลงในฐานข้อมูล
      const { data: answerKey, error: dbError } = await supabase
        .from('answer_keys')
        .insert({
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          content: content,
          subject_id: subjectId,
          term_id: termId,
          is_processed: false
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      setIsUploading(false);
      setMessage('อัปโหลดเสร็จสิ้น กำลังประมวลผล...');
      setIsProcessing(true);
      
      // 4. ส่งไปประมวลผลด้วย Langchain
      const response = await fetch('/api/llm/process-answer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerKeyId: answerKey.answer_key_id,
          content: content
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error processing answer key');
      }
      
      setIsProcessing(false);
      setMessage('อัปโหลดและประมวลผลเสร็จสิ้น');
      reset();
      
      // รอ 3 วินาทีแล้วล้างข้อความ
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('Error uploading answer key:', error);
      setIsUploading(false);
      setIsProcessing(false);
      setMessage(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">อัปโหลดไฟล์เฉลย</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ไฟล์เฉลย
          </label>
          <input
            type="file"
            {...register('answerKeyFile', { required: 'กรุณาเลือกไฟล์' })}
            className="w-full border-gray-300 rounded-md shadow-sm"
            accept=".txt,.md,.pdf,.docx"
            disabled={isUploading || isProcessing}
          />
          {errors.answerKeyFile && (
            <p className="mt-1 text-sm text-red-600">{errors.answerKeyFile.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          disabled={isUploading || isProcessing}
        >
          {isUploading ? 'กำลังอัปโหลด...' : isProcessing ? 'กำลังประมวลผล...' : 'อัปโหลด'}
        </button>
      </form>
      
      {message && (
        <div className="mt-4 p-3 rounded-md bg-blue-50 text-blue-800">
          {message}
        </div>
      )}
    </div>
  );
}