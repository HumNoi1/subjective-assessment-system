// src/app/dashboard/page.js (ต่อ)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    classCount: 0,
    subjectCount: 0,
    studentCount: 0,
    assessmentCount: 0,
    pendingAssessments: 0,
    recentAssessments: []
  });
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
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
          setTeacher(teacherData);
          
          // ดึงข้อมูลสถิติ
          const [
            classesResult,
            subjectsResult,
            studentsResult,
            assessmentsResult,
            pendingAssessmentsResult,
            recentAssessmentsResult
          ] = await Promise.all([
            // จำนวนชั้นเรียน
            supabase
              .from('classes')
              .select('count', { count: 'exact' })
              .eq('teacher_id', teacherData.teacher_id),
            
            // จำนวนวิชา
            supabase
              .from('subjects')
              .select('count', { count: 'exact' })
              .eq('teacher_id', teacherData.teacher_id),
            
            // จำนวนนักเรียนทั้งหมดในชั้นเรียนที่รับผิดชอบ
            supabase
              .from('students')
              .select('count', { count: 'exact' })
              .in('class_id', supabase
                .from('classes')
                .select('class_id')
                .eq('teacher_id', teacherData.teacher_id)
              ),
            
            // จำนวนการประเมินทั้งหมด
            supabase
              .from('assessments')
              .select('count', { count: 'exact' })
              .in('answer_key_id', supabase
                .from('answer_keys')
                .select('answer_key_id')
                .in('subject_id', supabase
                  .from('subjects')
                  .select('subject_id')
                  .eq('teacher_id', teacherData.teacher_id)
                )
              ),
            
            // จำนวนการประเมินที่รอการอนุมัติ
            supabase
              .from('assessments')
              .select('count', { count: 'exact' })
              .eq('is_approved', false)
              .in('answer_key_id', supabase
                .from('answer_keys')
                .select('answer_key_id')
                .in('subject_id', supabase
                  .from('subjects')
                  .select('subject_id')
                  .eq('teacher_id', teacherData.teacher_id)
                )
              ),
            
            // การประเมินล่าสุด 5 รายการ
            supabase
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
              .in('answer_key_id', supabase
                .from('answer_keys')
                .select('answer_key_id')
                .in('subject_id', supabase
                  .from('subjects')
                  .select('subject_id')
                  .eq('teacher_id', teacherData.teacher_id)
                )
              )
              .order('created_at', { ascending: false })
              .limit(5)
          ]);
          
          setStats({
            classCount: classesResult.count || 0,
            subjectCount: subjectsResult.count || 0,
            studentCount: studentsResult.count || 0,
            assessmentCount: assessmentsResult.count || 0,
            pendingAssessments: pendingAssessmentsResult.count || 0,
            recentAssessments: recentAssessmentsResult.data || []
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8 text-black ">ยินดีต้อนรับ  {teacher?.name}</h1>
      
      {/* สถิติ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="ชั้นเรียน"
          value={stats.classCount}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          bgColor="bg-blue-500"
          linkUrl="/dashboard/classes"
        />
        
        <StatCard
          title="วิชาเรียน"
          value={stats.subjectCount}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          bgColor="bg-green-500"
          linkUrl="/dashboard/subjects"
        />
        
        <StatCard
          title="นักเรียน"
          value={stats.studentCount}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          bgColor="bg-yellow-500"
          linkUrl="/dashboard/students"
        />
        
        <StatCard
          title="รอการอนุมัติ"
          value={stats.pendingAssessments}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          bgColor="bg-red-500"
          linkUrl="/dashboard/assessments"
        />
      </div>
      
      {/* การประเมินล่าสุด */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">การประเมินล่าสุด</h2>
        </div>
        
        {stats.recentAssessments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            ไม่มีรายการประเมินล่าสุด
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    นักเรียน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วิชา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    คะแนน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentAssessments.map((assessment) => (
                  <tr key={assessment.assessment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assessment.student_answers?.students?.name || 'ไม่ระบุชื่อ'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {assessment.answer_keys?.subjects?.subject_name || 'ไม่ระบุวิชา'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assessment.score.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        assessment.is_approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assessment.is_approved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assessment.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/dashboard/assessments/${assessment.assessment_id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        รายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* ลิงก์ด่วน */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickLinkCard
          title="อัปโหลดไฟล์เฉลย"
          description="อัปโหลดไฟล์เฉลยสำหรับวิชาที่สอน"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
          linkUrl="/dashboard/answer-keys"
        />
        
        <QuickLinkCard
          title="อัปโหลดคำตอบนักเรียน"
          description="อัปโหลดไฟล์คำตอบของนักเรียน"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          linkUrl="/dashboard/student-answers"
        />
        
        <QuickLinkCard
          title="ตรวจคำตอบ"
          description="ตรวจและประเมินคำตอบของนักเรียน"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          linkUrl="/dashboard/assessments"
        />
        
        <QuickLinkCard
          title="สร้างโฟลเดอร์"
          description="สร้างโฟลเดอร์เก็บงานนักเรียน"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          linkUrl="/dashboard/folders"
        />
      </div>
    </div>
  );
}

// คอมโพเนนต์สำหรับแสดงสถิติ
function StatCard({ title, value, icon, bgColor, linkUrl }) {
  const router = useRouter();
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden cursor-pointer transition-transform transform hover:scale-105" onClick={() => router.push(linkUrl)}>
      <div className="flex items-center p-4">
        <div className={`${bgColor} rounded-lg p-3 text-white mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-black">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// คอมโพเนนต์สำหรับแสดงลิงก์ด่วน
function QuickLinkCard({ title, description, icon, linkUrl }) {
  const router = useRouter();
  
  return (
    <div 
      className="bg-white rounded-lg shadow overflow-hidden p-6 flex flex-col items-center text-center cursor-pointer transition-transform transform hover:scale-105 hover:shadow-lg"
      onClick={() => router.push(linkUrl)}
    >
      <div className="text-blue-500 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}