// src/app/dashboard/assessments/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AssessmentDetailPage({ params }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [teacherId, setTeacherId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูลอาจารย์ปัจจุบัน
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (teacherData) {
          setTeacherId(teacherData.teacher_id);
          
          // ดึงข้อมูลการประเมิน
          const { data, error } = await supabase
            .from('assessments')
            .select(`
              *,
              student_answers (
                *,
                students (name)
              ),
              answer_keys (
                *,
                subjects (subject_name)
              )
            `)
            .eq('assessment_id', id)
            .single();
          
          if (error) {
            throw new Error(error.message);
          }
          
          setAssessment(data);
        }
      } catch (error) {
        console.error('Error fetching assessment data:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router]);

  const handleApproveAssessment = async () => {
    try {
      setApproving(true);
      setError(null);
      
      const response = await fetch(`/api/assessments/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการอนุมัติ');
      }
      
      // อัปเดตข้อมูลการประเมิน
      setAssessment(prev => ({
        ...prev,
        is_approved: true,
        approved_by: teacherId
      }));
      
      setSuccessMessage('อนุมัติการประเมินสำเร็จ');
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error approving assessment:', error);
      setError(error.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>ไม่พบข้อมูลการประเมิน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">รายละเอียดการประเมิน</h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            ย้อนกลับ
          </button>
          
          {!assessment.is_approved && (
            <button
              onClick={handleApproveAssessment}
              disabled={approving}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {approving ? 'กำลังอนุมัติ...' : 'อนุมัติการประเมิน'}
            </button>
          )}
        </div>
      </div>
      
      {/* แสดงข้อความผิดพลาด */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* แสดงข้อความสำเร็จ */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* ข้อมูลการประเมิน */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 bg-blue-600 text-white">
            <h2 className="font-semibold">ข้อมูลนักเรียนและรายวิชา</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 mb-1">นักเรียน</p>
                <p className="text-lg font-medium">{assessment.student_answers?.students?.name}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">วิชา</p>
                <p className="text-lg font-medium">{assessment.answer_keys?.subjects?.subject_name}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">ชื่อไฟล์คำตอบ</p>
                <p className="text-lg font-medium">{assessment.student_answers?.file_name}</p>
              </div>
              
              <div>
                <p className="text-gray-600 mb-1">ชื่อไฟล์เฉลย</p>
                <p className="text-lg font-medium">{assessment.answer_keys?.file_name}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white">
            <h2 className="font-semibold">สรุปผลการประเมิน</h2>
          </div>
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-blue-600 mb-2">{assessment.score.toFixed(2)}%</div>
              <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                assessment.is_approved 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {assessment.is_approved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-gray-600 mb-1">ความมั่นใจในการตรวจ</p>
              <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    assessment.confidence >= 70 ? 'bg-green-500' : 
                    assessment.confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${assessment.confidence}%` }}
                ></div>
              </div>
              <p className="text-right text-sm text-gray-600 mt-1">{assessment.confidence}%</p>
            </div>
            
            <div className="mt-4">
              <p className="text-gray-600 mb-1">วันที่ประเมิน</p>
              <p className="text-lg font-medium">{new Date(assessment.assessment_date).toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* คำตอบและไฟล์เฉลย */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white">
            <h2 className="font-semibold">ไฟล์เฉลย</h2>
          </div>
          <div className="p-6 h-60 overflow-auto whitespace-pre-wrap">
            {assessment.answer_keys?.content}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-green-600 text-white">
            <h2 className="font-semibold">คำตอบนักเรียน</h2>
          </div>
          <div className="p-6 h-60 overflow-auto whitespace-pre-wrap">
            {assessment.student_answers?.content}
          </div>
        </div>
      </div>
      
      {/* ข้อเสนอแนะ */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-purple-600 text-white">
          <h2 className="font-semibold">ข้อเสนอแนะ</h2>
        </div>
        <div className="p-6 whitespace-pre-wrap">
          {assessment.feedback_text}
        </div>
      </div>
    </div>
  );
}