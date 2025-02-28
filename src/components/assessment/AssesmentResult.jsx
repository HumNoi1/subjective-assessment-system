// components/assessment/AssessmentResult.jsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AssessmentResult({ assessment, onApprove }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // แปลงคะแนนเป็นเปอร์เซ็นต์
  const scorePercentage = (assessment.score / 20) * 100;
  
  // กำหนดสีตามคะแนน
  const getScoreColor = () => {
    if (scorePercentage >= 80) return 'text-green-600';
    if (scorePercentage >= 70) return 'text-blue-600';
    if (scorePercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // กำหนดสีตามความมั่นใจ
  const getConfidenceColor = () => {
    if (assessment.confidence >= 90) return 'text-green-600';
    if (assessment.confidence >= 70) return 'text-blue-600';
    if (assessment.confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // แปลงข้อความ feedback จาก LLM
  const renderFeedback = () => {
    // แยกข้อความตามบรรทัด
    const lines = assessment.feedback_text.split('\n');
    
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          // หาหัวข้อ
          const titleMatch = line.match(/^([^:]+):\s*(.*)/);
          
          if (titleMatch) {
            const [, title, content] = titleMatch;
            return (
              <div key={index}>
                <span className="font-semibold">{title}:</span> {content}
              </div>
            );
          }
          
          return <div key={index}>{line}</div>;
        })}
      </div>
    );
  };
  
  const handleApprove = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const { error: updateError } = await supabase
        .from('assessments')
        .update({ 
          is_approved: true,
          approved_by: 1 // ควรใช้ ID ของอาจารย์ที่ login อยู่
        })
        .eq('assessment_id', assessment.assessment_id);
      
      if (updateError) throw updateError;
      
      setIsLoading(false);
      if (onApprove) onApprove(assessment.assessment_id);
      
    } catch (err) {
      console.error('Error approving assessment:', err);
      setError('เกิดข้อผิดพลาดในการอนุมัติ: ' + err.message);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">ผลการประเมิน</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">ความมั่นใจในการประเมิน:</span>
          <span className={`font-bold ${getConfidenceColor()}`}>
            {assessment.confidence}%
          </span>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">คะแนน</span>
          <span className={`font-bold ${getScoreColor()}`}>
            {assessment.score}/20 ({scorePercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${scorePercentage >= 80 ? 'bg-green-600' : 
              scorePercentage >= 70 ? 'bg-blue-600' : 
              scorePercentage >= 60 ? 'bg-yellow-600' : 
              'bg-red-600'}`}
            style={{ width: `${scorePercentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">ข้อเสนอแนะ</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          {renderFeedback()}
        </div>
      </div>
      
      {!assessment.is_approved && (
        <div className="flex justify-end">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {isLoading ? 'กำลังดำเนินการ...' : 'อนุมัติผลการประเมิน'}
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-800">
          {error}
        </div>
      )}
      
      {assessment.is_approved && (
        <div className="mt-4 p-3 rounded-md bg-green-50 text-green-800">
          ผ่านการอนุมัติแล้ว
        </div>
      )}
    </div>
  );
}