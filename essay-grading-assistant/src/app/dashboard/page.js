// File: app/dashboard/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    semesters: 0,
    classes: 0,
    subjects: 0,
    assignments: 0,
    submissions: 0,
    pendingGrading: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentSubmissions, setRecentSubmissions] = useState([])

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return
      setLoading(true)
      
      try {
        // ดึงข้อมูลสรุปสถิติ
        const [
          { data: semesters }, 
          { data: classes }, 
          { data: subjects }, 
          { data: assignments }, 
          { data: submissions },
          { data: pendingSubmissions }
        ] = await Promise.all([
          supabase.from('semesters').select('id').eq('teacher_id', user.id),
          supabase.from('classes').select('id').eq('teacher_id', user.id),
          supabase.from('subjects').select('id').eq('teacher_id', user.id),
          supabase.from('assignments').select('id').eq('teacher_id', user.id),
          supabase.from('student_submissions').select('id').eq('teacher_id', user.id),
          supabase.from('student_submissions').select('id').eq('teacher_id', user.id).eq('is_graded', false)
        ])

        // ดึงข้อมูลงานที่รอตรวจล่าสุด
        const { data: recent } = await supabase
          .from('student_submissions')
          .select(`
            id, 
            student_name, 
            student_id, 
            file_name, 
            uploaded_at, 
            is_graded,
            assignment_id,
            assignments (name, subject_id),
            assignments.subjects (name)
          `)
          .eq('teacher_id', user.id)
          .order('uploaded_at', { ascending: false })
          .limit(5)

        setStats({
          semesters: semesters?.length || 0,
          classes: classes?.length || 0,
          subjects: subjects?.length || 0,
          assignments: assignments?.length || 0,
          submissions: submissions?.length || 0,
          pendingGrading: pendingSubmissions?.length || 0
        })
        
        setRecentSubmissions(recent || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  // แปลงวันที่เป็นรูปแบบไทย
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">กำลังโหลดข้อมูล...</span>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ด</h1>
        <p className="text-gray-500">ภาพรวมระบบผู้ช่วยตรวจข้อสอบอัตนัย</p>
      </div>

      {/* สถิติแบบการ์ด */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-2">งานที่รอตรวจ</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-blue-600">{stats.pendingGrading}</div>
            <div className="ml-2 text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full">
              ทั้งหมด {stats.submissions} งาน
            </div>
          </div>
          <Link href="/submissions?status=pending" className="mt-3 text-sm text-blue-600 hover:underline block">
            ดูงานที่รอตรวจ →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-2">งานและแบบทดสอบ</h2>
          <div className="text-3xl font-bold text-indigo-600">{stats.assignments}</div>
          <Link href="/assignments" className="mt-3 text-sm text-indigo-600 hover:underline block">
            จัดการงานและแบบทดสอบ →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-2">วิชาเรียน</h2>
          <div className="text-3xl font-bold text-emerald-600">{stats.subjects}</div>
          <div className="mt-1 text-sm text-gray-500">ใน {stats.classes} ชั้นเรียน, {stats.semesters} เทอม</div>
          <Link href="/subjects" className="mt-2 text-sm text-emerald-600 hover:underline block">
            จัดการวิชาเรียน →
          </Link>
        </div>
      </div>

      {/* งานที่ส่งล่าสุด */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden text-black">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">งานที่นักเรียนส่งล่าสุด</h2>
        </div>
        
        {recentSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">นักเรียน</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">งาน</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ส่ง</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSubmissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{submission.student_name}</div>
                      <div className="text-gray-500 text-sm">{submission.student_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{submission.assignments?.name}</div>
                      <div className="text-gray-500 text-sm">{submission.assignments?.subjects?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(submission.uploaded_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.is_graded ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ตรวจแล้ว
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          รอตรวจ
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/submissions/${submission.id}/grade`} className="text-blue-600 hover:text-blue-900 mr-3">
                        {submission.is_graded ? 'ดูผลตรวจ' : 'ตรวจงาน'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            ไม่พบงานที่นักเรียนส่งล่าสุด
          </div>
        )}
        
        <div className="px-6 py-4 border-t">
          <Link href="/submissions" className="text-sm text-blue-600 hover:text-blue-800">
            ดูงานทั้งหมด →
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}