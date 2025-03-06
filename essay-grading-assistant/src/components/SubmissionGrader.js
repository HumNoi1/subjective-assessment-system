// src/components/SubmissionGrader.jsx
'use client'

import { useState } from 'react';
import { marked } from 'marked';

export default function SubmissionGrader({ 
  assignmentId, 
  submissionId,
  question, 
  solutionContent,
  submissionContent,
  onGraded 
}) {
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [error, setError] = useState('');

  const handleGrade = async () => {
    try {
      setIsGrading(true);
      setError('');
      
      const response = await fetch('/api/grading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          assignmentId,
          submissionId,
          solutionContent,
          submissionContent
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการตรวจคำตอบ');
      }
      
      setGradingResult(data);
      
      // เรียกฟังก์ชัน callback หากมีการกำหนด
      if (onGraded) {
        onGraded(data);
      }
      
    } catch (err) {
      console.error('Error grading submission:', err);
      setError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsGrading(false);
    }
  };

  // แปลงข้อความ markdown เป็น HTML
  const renderMarkdown = (text) => {
    if (!text) return '';
    return { __html: marked(text) };
  };

  // ดึงคะแนนจากผลการตรวจ
  const getScore = () => {
    if (!gradingResult || !gradingResult.score) return 'N/A';
    return `${gradingResult.score}/100`;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-black">ตรวจคำตอบนักเรียน</h2>
        
        <button
          onClick={handleGrade}
          disabled={isGrading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition inline-flex items-center justify-center"
        >
          {isGrading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังตรวจ...
            </>
          ) : 'ตรวจคำตอบด้วย RAG'}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-black">
        <div className="p-4 bg-gray-50 rounded-md shadow-sm">
          <h3 className="text-lg font-medium mb-2 ">โจทย์</h3>
          <div className="p-3 bg-white rounded">
            <div className="prose prose-sm" dangerouslySetInnerHTML={renderMarkdown(question)} />
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-md shadow-sm text-black">
          <h3 className="text-lg font-medium mb-2">คำตอบนักเรียน</h3>
          <div className="p-3 bg-white rounded h-[300px] overflow-y-auto">
            <div className="prose prose-sm" dangerouslySetInnerHTML={renderMarkdown(submissionContent)} />
          </div>
        </div>
      </div>
      
      {gradingResult && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between p-4 bg-blue-50 rounded-md">
            <h3 className="text-xl font-medium">ผลการตรวจ</h3>
            <div className="text-2xl font-bold">
              {getScore()}
            </div>
          </div>
          
          <div className="p-6 bg-white rounded-md shadow">
            <h4 className="text-lg font-medium mb-4">การวิเคราะห์คำตอบ</h4>
            <div className="prose max-w-none" dangerouslySetInnerHTML={renderMarkdown(gradingResult.gradingResult)} />
          </div>
          
          <div className="mt-6 p-6 bg-yellow-50 rounded-md shadow">
            <h4 className="text-lg font-medium mb-4">ประเด็นสำคัญในเฉลย</h4>
            <div className="prose max-w-none" dangerouslySetInnerHTML={renderMarkdown(gradingResult.keyPoints)} />
          </div>
          
          {gradingResult.has_rag_context && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
              ระบบใช้ RAG ในการตรวจคำตอบ: มีการดึงข้อมูลจาก Vector Database เพื่อช่วยในการตรวจ
            </div>
          )}
        </div>
      )}
    </div>
  );
}