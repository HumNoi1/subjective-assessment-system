// app/dashboard/assessment/evaluate/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { StudentAnswerUploader } from '@/components/assessment/StudentAnswerUploader';
import { AssessmentResult } from '@/components/assessment/AssessmentResult';

export default function EvaluateAnswerPage() {
  const searchParams = useSearchParams();
  const answerKeyId = searchParams.get('answerKeyId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [answerKey, setAnswerKey] = useState(null);
  const [studentAnswer, setStudentAnswer] = useState(null);
  const [assessment, setAssessment] = useState(null);
  
  useEffect(() => {
    const fetchAnswerKey = async () => {
      if (!answerKeyId) {
        setError('ไม่พบรหัสไฟล์เฉลย');
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('answer_keys')
          .select('*, subjects(*), terms(*)')
          .eq('answer_key_id', answerKeyId)
          .single();
        
        if (error) throw error;
        
        setAnswerKey(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching answer key:', err);
        setError('ไม่สามารถดึงข้อมูลไฟล์เฉลยได้');
        setIsLoading(false);
      }
    };
    
    fetchAnswerKey();
  }, [answerKeyId]);
  
  const handleStudentAnswerUploaded = (data) => {
    setStudentAnswer(data);
  };
  
  const handleEvaluationComplete = (assessmentData) => {
    setAssessment(assessmentData);
  };
  
  const handleApprove = async (assessmentId) => {
    // รีเฟรชข้อมูลหลังจากอนุมัติ
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('assessment_id', assessmentId)
        .single();
      
      if (error) throw error;
      
      setAssessment(data);
    } catch (err) {
      console.error('Error refreshing assessment data:', err);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">กำลังโหลด...</div>;
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ตรวจคำตอบนักเรียน</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">ข้อมูลเฉลย</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500">วิชา:</span>
            <span className="ml-2 font-medium">{answerKey.subjects.subject_name}</span>
          </div>
          <div>
            <span className="text-gray-500">เทอม:</span>
            <span className="ml-2 font-medium">{answerKey.terms.term_name}</span>
          </div>
          <div>
            <span className="text-gray-500">ชื่อไฟล์:</span>
            <span className="ml-2 font-medium">{answerKey.file_name}</span>
          </div>
          <div>
            <span className="text-gray-500">อัปโหลดเมื่อ:</span>
            <span className="ml-2 font-medium">
              {new Date(answerKey.upload_date).toLocaleString('th-TH')}
            </span>
          </div>
        </div>
      </div>
      
      {!studentAnswer && (
        <StudentAnswerUploader 
          answerKeyId={answerKeyId}
          onSuccess={handleStudentAnswerUploaded}
        />
      )}
      
      {studentAnswer && !assessment && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">กำลังประเมินคำตอบ...</h2>
          <p>กำลังวิเคราะห์คำตอบของนักเรียน โปรดรอสักครู่...</p>
          
          {/* ปุ่มสำหรับเริ่มการประเมิน */}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/llm/evaluate-answer', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    studentAnswerId: studentAnswer.student_answer_id
                  })
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Error evaluating answer');
                }
                
                const result = await response.json();
                handleEvaluationComplete(result.assessment);
              } catch (err) {
                console.error('Error starting evaluation:', err);
                setError('เกิดข้อผิดพลาดในการประเมิน: ' + err.message);
              }
            }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            เริ่มการประเมิน
          </button>
        </div>
      )}
      
      {assessment && (
        <AssessmentResult 
          assessment={assessment}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}