// File: app/submissions/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Submissions() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')
  const statusFilter = searchParams.get('status')

  const [submissions, setSubmissions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAssignment, setSelectedAssignment] = useState(assignmentId || 'all')
  const [selectedStatus, setSelectedStatus] = useState(statusFilter || 'all')
  const [newSubmission, setNewSubmission] = useState({
    assignment_id: assignmentId || '',
    student_name: '',
    student_id: '',
    file: null
  })
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, selectedAssignment, selectedStatus])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // ดึงข้อมูลงานและแบบทดสอบ
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id, 
          name,
          subjects:subjects(id, name)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (assignmentsError) throw assignmentsError
      setAssignments(assignmentsData || [])
      
      // สร้าง URL สำหรับดึงข้อมูลงานที่นักเรียนส่ง
      let fetchUrl = `/api/submissions?teacherId=${user.id}`
      
      // เพิ่มฟิลเตอร์ตามงานที่เลือก
      if (selectedAssignment && selectedAssignment !== 'all') {
        fetchUrl += `&assignmentId=${selectedAssignment}`
      }
      
      // ดึงข้อมูลงานที่นักเรียนส่ง
      const submissionsRes = await fetch(fetchUrl)
      
      if (!submissionsRes.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลงานที่นักเรียนส่งได้')
      }
      
      let submissionsData = await submissionsRes.json()
      
      // กรองตามสถานะการตรวจ (ถ้ามีการเลือก)
      if (selectedStatus === 'pending') {
        submissionsData = submissionsData.filter(submission => !submission.is_graded)
      } else if (selectedStatus === 'graded') {
        submissionsData = submissionsData.filter(submission => submission.is_graded)
      }
      
      // ดึงข้อมูลเพิ่มเติมสำหรับแต่ละการส่งงาน
      const enrichedSubmissions = await Promise.all(
        submissionsData.map(async (submission) => {
          // ดึงข้อมูลงาน
          const assignment = assignmentsData.find(a => a.id === submission.assignment_id) || { name: 'ไม่ระบุ' }
          
          // ดึงข้อมูลคะแนน (ถ้ามี)
          let grade = null
          if (submission.is_graded) {
            const { data: gradeData } = await supabase
              .from('grades')
              .select('*')
              .eq('submission_id', submission.id)
              .single()
            
            grade = gradeData
          }
          
          return {
            ...submission,
            assignment_name: assignment.name,
            subject_name: assignment.subjects?.name || 'ไม่ระบุ',
            grade
          }
        })
      )
      
      setSubmissions(enrichedSubmissions)
      
      // ตั้งค่าค่าเริ่มต้นสำหรับฟอร์มใหม่
      if (assignmentsData.length > 0 && !newSubmission.assignment_id) {
        setNewSubmission(prev => ({ 
          ...prev, 
          assignment_id: assignmentsData[0].id 
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('ไม่สามารถดึงข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewSubmission({ ...newSubmission, file: e.target.files[0] })
    }
  }

  const handleAddSubmission = async (e) => {
    e.preventDefault()
    try {
      setIsAdding(true)
      setError(null)
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (!newSubmission.assignment_id || !newSubmission.student_name || !newSubmission.student_id || !newSubmission.file) {
        throw new Error('กรุณากรอกข้อมูลและเลือกไฟล์ให้ครบถ้วน')
      }
      
      // 1. อัปโหลดไฟล์
      const fileExt = newSubmission.file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${newSubmission.assignment_id}/${newSubmission.student_id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('student_submissions')
        .upload(filePath, newSubmission.file)
        
      if (uploadError) throw uploadError
        
      // 2. บันทึกข้อมูลการส่งงาน
      const { data: submissionData, error: submissionError } = await supabase
        .from('student_submissions')
        .insert([{
          teacher_id: user.id,
          assignment_id: newSubmission.assignment_id,
          student_name: newSubmission.student_name,
          student_id: newSubmission.student_id,
          file_name: newSubmission.file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: newSubmission.file.size,
          uploaded_at: new Date(),
          is_graded: false
        }])
        .select()
        
      if (submissionError) throw submissionError
      
      // 3. สร้าง embedding สำหรับเนื้อหาไฟล์ (ถ้ามีการใช้งาน RAG)
      try {
        const fileContent = await readFileAsBase64(newSubmission.file)
        
        await fetch('/api/embeddings/submission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            submissionId: submissionData[0].id,
            assignmentId: newSubmission.assignment_id,
            studentId: newSubmission.student_id,
            fileContent
          })
        })
      } catch (embeddingError) {
        console.error('Error creating submission embedding:', embeddingError)
        // ไม่ throw error เพื่อให้ยังบันทึกได้แม้จะสร้าง embedding ไม่สำเร็จ
      }
      
      // 4. เพิ่มข้อมูลการส่งงานใหม่เข้าไปในรายการ
      const assignment = assignments.find(a => a.id === newSubmission.assignment_id) || { name: 'ไม่ระบุ', subjects: { name: 'ไม่ระบุ' } }
      
      const newSubmissionWithDetails = {
        ...submissionData[0],
        assignment_name: assignment.name,
        subject_name: assignment.subjects?.name || 'ไม่ระบุ',
        grade: null
      }
      
      setSubmissions([newSubmissionWithDetails, ...submissions])
      
      // 5. รีเซ็ตฟอร์ม
      setNewSubmission({
        assignment_id: newSubmission.assignment_id,
        student_name: '',
        student_id: '',
        file: null
      })
      
      // รีเซ็ต input file
      const fileInput = document.getElementById('submission-file')
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      console.error('Error adding submission:', error)
      setError(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  // อ่านไฟล์เป็น base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        // ดึงเฉพาะ base64 data จาก data URL
        const base64String = reader.result.split(',')[1]
        resolve(base64String)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

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

  return (
    <AppLayout>
      <div className="mb-6 flex justify-between items-center text-black">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">งานที่นักเรียนส่ง</h1>
          <p className="text-gray-500">จัดการงานที่นักเรียนส่งทั้งหมด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-black">
        {/* ฟอร์มเพิ่มงานใหม่ */}
        <Card title="เพิ่มงานนักเรียน">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
              กรุณาสร้างงานและแบบทดสอบก่อนเพิ่มงานที่นักเรียนส่ง
            </div>
          ) : (
            <form onSubmit={handleAddSubmission}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  งาน/แบบทดสอบ
                </label>
                <select
                  value={newSubmission.assignment_id}
                  onChange={(e) => setNewSubmission({ ...newSubmission, assignment_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">เลือกงาน/แบบทดสอบ</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.name} - {assignment.subjects?.name || 'ไม่ระบุวิชา'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อนักเรียน
                </label>
                <input
                  type="text"
                  value={newSubmission.student_name}
                  onChange={(e) => setNewSubmission({ ...newSubmission, student_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="เช่น นายสมชาย ใจดี"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสนักเรียน
                </label>
                <input
                  type="text"
                  value={newSubmission.student_id}
                  onChange={(e) => setNewSubmission({ ...newSubmission, student_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="เช่น 6401234"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ไฟล์งาน
                </label>
                <input
                  id="submission-file"
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:rounded-md file:border-0
                    file:bg-blue-50 file:px-4 file:py-2
                    file:text-sm file:font-semibold file:text-blue-700
                    hover:file:bg-blue-100"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มงาน'}
              </button>
            </form>
          )}
        </Card>
        
        {/* แสดงรายการงานที่นักเรียนส่ง */}
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
              {/* ตัวกรองตามงาน */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  กรองตามงาน
                </label>
                <select
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="all">ทั้งหมด</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.name} - {assignment.subjects?.name || 'ไม่ระบุวิชา'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* ตัวกรองตามสถานะการตรวจ */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  สถานะการตรวจ
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="pending">รอตรวจ</option>
                  <option value="graded">ตรวจแล้ว</option>
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">ไม่พบงานที่นักเรียนส่ง</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 font-medium">นักเรียน</th>
                      <th className="pb-2 font-medium">งาน</th>
                      <th className="pb-2 font-medium">วันที่ส่ง</th>
                      <th className="pb-2 font-medium">สถานะ</th>
                      <th className="pb-2 font-medium">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium">{submission.student_name}</div>
                          <div className="text-xs text-gray-500">{submission.student_id}</div>
                        </td>
                        <td className="py-3">
                          <div>{submission.assignment_name}</div>
                          <div className="text-xs text-gray-500">{submission.subject_name}</div>
                        </td>
                        <td className="py-3 text-sm">
                          {formatDate(submission.uploaded_at)}
                        </td>
                        <td className="py-3">
                          {submission.is_graded ? (
                            <div className="flex flex-col">
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full inline-block text-center">
                                ตรวจแล้ว
                              </span>
                              {submission.grade && (
                                <span className="mt-1 text-sm text-center font-medium">
                                  {submission.grade.score}/{submission.grade.max_score}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full inline-block text-center">
                              รอตรวจ
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Link
                              href={`/submissions/${submission.id}/grade`}
                              className="rounded-md px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 text-center"
                            >
                              {submission.is_graded ? 'ดูผลตรวจ' : 'ตรวจงาน'}
                            </Link>
                            
                            <a
                              href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/student_submissions/${submission.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 text-center"
                            >
                              ดูไฟล์
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}