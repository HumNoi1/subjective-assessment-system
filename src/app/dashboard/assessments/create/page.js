// src/app/dashboard/assessments/create/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CreateAssessmentPage() {
  const [studentAnswer, setStudentAnswer] = useState(null);
  const [answerKey, setAnswerKey] = useState(null);
  const [comparison, setComparison] = useState('');
  const [relevantContent, setRelevantContent] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [confidence, setConfidence] = useState(70);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [gettingRelevantContent, setGettingRelevantContent] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [useLlamaIndex, setUseLlamaIndex] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentAnswerId = searchParams.get('studentAnswerId');
  const answerKeyId = searchParams.get('answerKeyId');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!studentAnswerId || !answerKeyId) {
          router.push('/dashboard/student-answers');
          return;
        }

        const [studentAnswerResult, answerKeyResult] = await Promise.all([
          supabase
            .from('student_answers')
            .select(`
              *,
              students (name),
              answer_keys (
                *,
                subjects (subject_name)
              )
            `)
            .eq('student_answer_id', studentAnswerId)
            .single(),
          
          supabase
            .from('answer_keys')
            .select(`
              *,
              subjects (subject_name)
            `)
            .eq('answer_key_id', answerKeyId)
            .single()
        ]);

        if (studentAnswerResult.error) {
          throw new Error(studentAnswerResult.error.message);
        }

        if (answerKeyResult.error) {
          throw new Error(answerKeyResult.error.message);
        }

        setStudentAnswer(studentAnswerResult.data);
        setAnswerKey(answerKeyResult.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentAnswerId, answerKeyId, router]);

  const handleGetRelevantContent = async () => {
    try {
      setGettingRelevantContent(true);
      setError(null);

      const response = await fetch('/api/llamaindex/relevant-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAnswer: studentAnswer.content,
          answerKeyId: answerKeyId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการค้นหาเนื้อหาที่เกี่ยวข้อง');
      }

      setRelevantContent(data.relevantContent);
      setError(null);
    } catch (error) {
      console.error('Error getting relevant content:', error);
      setError(error.message);
    } finally {
      setGettingRelevantContent(false);
    }
  };

  const handleCompareAnswers = async () => {
    try {
      setComparing(true);
      setError(null);

      const response = await fetch('/api/llm/compare-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAnswer: studentAnswer.content,
          answerKey: answerKey.content,
          studentAnswerId,
          answerKeyId,
          useLlamaIndex
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการเปรียบเทียบคำตอบ');
      }

      setComparison(data.result);
      
      // หากเราใช้ LlamaIndex แต่ไม่ได้ดึงเนื้อหาที่เกี่ยวข้องก่อนหน้านี้
      if (data.used_llamaindex && !relevantContent) {
        // ดึงเนื้อหาที่เกี่ยวข้องโดยตรง
        await handleGetRelevantContent();
      }
      
      setStep(2);
    } catch (error) {
      console.error('Error comparing answers:', error);
      setError(error.message);
    } finally {
      setComparing(false);
    }
  };

  const handleScoreAnswer = async () => {
    try {
      setScoring(true);
      setError(null);

      const response = await fetch('/api/llm/self-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comparisonResult: comparison,
          studentAnswer: studentAnswer.content,
          answerKey: answerKey.content,
          studentAnswerId,
          answerKeyId,
          useLlamaIndex
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการให้คะแนน');
      }

      setScore(data.score || 0);
      
      // ขอข้อเสนอแนะ
      const feedbackResponse = await fetch('/api/llm/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAnswer: studentAnswer.content,
          answerKey: answerKey.content,
          score: data.score,
          comparisonResult: comparison,
          studentAnswerId,
          answerKeyId,
          useLlamaIndex
        }),
      });

      const feedbackData = await feedbackResponse.json();

      if (!feedbackResponse.ok) {
        throw new Error(feedbackData.error || 'เกิดข้อผิดพลาดในการสร้างข้อเสนอแนะ');
      }

      setFeedback(feedbackData.feedback);
      setStep(3);
    } catch (error) {
      console.error('Error scoring answer:', error);
      setError(error.message);
    } finally {
      setScoring(false);
    }
  };

  const handleSubmitAssessment = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAnswerId,
          answerKeyId,
          score,
          feedbackText: feedback,
          confidence,
          useLlamaIndex
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึกการประเมิน');
      }

      router.push(`/dashboard/assessments/${data.assessment.assessment_id}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ตรวจคำตอบอัตนัย</h1>
      
      {/* แสดงข้อความผิดพลาด */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* ขั้นตอนการตรวจ */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`rounded-full h-10 w-10 flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`h-1 w-16 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <div className={`h-1 w-16 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">
              {step === 1 && 'ขั้นตอนที่ 1: เปรียบเทียบคำตอบ'}
              {step === 2 && 'ขั้นตอนที่ 2: ให้คะแนน'}
              {step === 3 && 'ขั้นตอนที่ 3: ตรวจสอบและบันทึก'}
            </div>
          </div>
        </div>
      </div>
      
      {/* ตัวเลือกการใช้ LlamaIndex */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="use-llamaindex"
              type="checkbox"
              checked={useLlamaIndex}
              onChange={(e) => setUseLlamaIndex(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="use-llamaindex" className="ml-2 block text-sm text-gray-900">
              ใช้ LlamaIndex เพื่อค้นหาเนื้อหาที่เกี่ยวข้อง (ได้ผลดีกับเอกสารที่ยาว)
            </label>
          </div>
          
          {step === 1 && (
            <button
              onClick={handleGetRelevantContent}
              disabled={gettingRelevantContent || !useLlamaIndex}
              className={`${useLlamaIndex ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {gettingRelevantContent ? 'กำลังค้นหา...' : 'ดึงเนื้อหาที่เกี่ยวข้อง'}
            </button>
          )}
        </div>
        
        {relevantContent && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">เนื้อหาที่เกี่ยวข้องจาก LlamaIndex:</h3>
            <p className="text-sm text-gray-700">{relevantContent}</p>
          </div>
        )}
      </div>
      
      {/* รายละเอียดงาน */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">รายละเอียดงาน</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-2">ข้อมูลนักเรียน</h3>
            <p><span className="font-medium">ชื่อนักเรียน:</span> {studentAnswer?.students?.name}</p>
            <p><span className="font-medium">ชื่อไฟล์:</span> {studentAnswer?.file_name}</p>
            <p><span className="font-medium">วันที่อัปโหลด:</span> {new Date(studentAnswer?.upload_date).toLocaleDateString('th-TH')}</p>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">ข้อมูลเฉลย</h3>
            <p><span className="font-medium">วิชา:</span> {answerKey?.subjects?.subject_name}</p>
            <p><span className="font-medium">ชื่อไฟล์เฉลย:</span> {answerKey?.file_name}</p>
          </div>
        </div>
      </div>
      
      {/* ขั้นตอนที่ 1: เปรียบเทียบคำตอบ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-blue-600 text-white">
                <h3 className="font-semibold">เฉลย</h3>
              </div>
              <div className="p-6 h-80 overflow-auto whitespace-pre-wrap">
                {answerKey?.content}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-green-600 text-white">
                <h3 className="font-semibold">คำตอบนักเรียน</h3>
              </div>
              <div className="p-6 h-80 overflow-auto whitespace-pre-wrap">
                {studentAnswer?.content}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleCompareAnswers}
              disabled={comparing}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {comparing ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                  กำลังเปรียบเทียบ...
                </>
              ) : (
                'เปรียบเทียบคำตอบ'
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* ขั้นตอนที่ 2: ให้คะแนน */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-purple-600 text-white">
              <h3 className="font-semibold">ผลการเปรียบเทียบ</h3>
            </div>
            <div className="p-6 max-h-96 overflow-auto whitespace-pre-wrap">
              {comparison}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              ย้อนกลับ
            </button>
            
            <button
              onClick={handleScoreAnswer}
              disabled={scoring}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {scoring ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                  กำลังให้คะแนน...
                </>
              ) : (
                'ให้คะแนน'
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* ขั้นตอนที่ 3: ตรวจสอบและบันทึก */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2">
              <div className="px-6 py-4 bg-green-600 text-white">
                <h3 className="font-semibold">ข้อเสนอแนะ</h3>
              </div>
              <div className="p-6">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full h-80 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 bg-blue-600 text-white">
                  <h3 className="font-semibold">คะแนน</h3>
                </div>
                <div className="p-6">
                  <div className="text-center mb-4">
                    <span className="text-5xl font-bold">{score}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 bg-yellow-600 text-white">
                  <h3 className="font-semibold">ความมั่นใจในการตรวจ</h3>
                </div>
                <div className="p-6">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold">{confidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={confidence}
                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              ย้อนกลับ
            </button>
            
            <button
              onClick={handleSubmitAssessment}
              disabled={submitting}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกการประเมิน'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}