'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // ดึงข้อมูลอาจารย์
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (teacher) {
        setTeacherId(teacher.teacher_id);
        fetchAssessments(teacher.teacher_id);
      }
    };
    
    checkSession();
  }, [router]);

  const fetchAssessments = async (teacherId) => {
    try {
      // ดึงการประเมินที่เกี่ยวข้องกับวิชาที่อาจารย์สอน
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
            subjects (
              subject_name,
              teacher_id
            )
          )
        `)
        .eq('answer_keys.subjects.teacher_id', teacherId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAssessments(data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveAssessment = async (assessmentId) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // อัพเดตสถานะในรายการ
        setAssessments(assessments.map(assessment => {
          if (assessment.assessment_id === assessmentId) {
            return { ...assessment, is_approved: true, approved_by: teacherId };
          }
          return assessment;
        }));
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving assessment:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติ');
    }
  };

  if (loading) {
    return <div className="p-8">กำลังโหลด...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">รายการประเมินทั้งหมด</h1>
      
      {assessments.length === 0 ? (
        <div className="p-4 border rounded bg-gray-50">ไม่พบรายการประเมิน</div>
      ) : (
        <div className="grid gap-6">
          {assessments.map((assessment) => (
            <div key={assessment.assessment_id} className="border rounded-lg shadow-sm p-6 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {assessment.student_answers?.students?.name || 'ไม่ระบุชื่อนักเรียน'}
                  </h2>
                  <p className="text-gray-600">
                    วิชา: {assessment.answer_keys?.subjects?.subject_name || 'ไม่ระบุวิชา'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {assessment.score.toFixed(2)}%
                  </div>
                  <div className={`text-sm px-2 py-1 rounded ${
                    assessment.is_approved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {assessment.is_approved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">ข้อเสนอแนะ</h3>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-line">
                  {assessment.feedback_text}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">
                    ความมั่นใจในการตรวจ: {assessment.confidence}%
                  </span>
                </div>
                
                {!assessment.is_approved && (
                  <button
                    onClick={() => approveAssessment(assessment.assessment_id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    อนุมัติการประเมิน
                  </button>
                )}
                
                <button
                  onClick={() => router.push(`/dashboard/assessments/${assessment.assessment_id}`)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  ดูรายละเอียด
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}