// File: app/submissions/[id]/grade/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import { supabase } from '@/lib/supabase'
import SubmissionGrader from '@/components/SubmissionGrader'
import { useRouter } from 'next/navigation'
import { marked } from 'marked'

export default function GradeSubmission({ params }) {
  const { id: submissionId } = params
  const { user } = useAuth()
  const router = useRouter()
  
  const [submission, setSubmission] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [solution, setSolution] = useState(null)
  const [submissionContent, setSubmissionContent] = useState('')
  const [solutionContent, setSolutionContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [grade, setGrade] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (user && submissionId) {
      fetchData()
    }
  }, [user, submissionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // 1. ดึงข้อมูลงานที่ส่ง
      const { data: submissionData, error: submissionError } = await supabase
        .from('student_submissions')
        .select('*')
        .eq('id', submissionId)
        .single()
      
      if (submissionError) throw submissionError
      setSubmission(submissionData)
      
      // 2. ดึงข้อมูลงาน/แบบทดสอบ
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects:subjects(name)
        `)
        .eq('id', submissionData.assignment_id)
        .single()
      
      if (assignmentError) throw assignmentError
      setAssignment(assignmentData)
      
      // 3. ดึงข้อมูลเฉลย
      const { data: solutionData, error: solutionError } = await supabase
        .from('solutions')
        .select('*')
        .eq('assignment_id', submissionData.assignment_id)
        .single()
      
      // อาจจะยังไม่มีเฉลย
      if (!solutionError && solutionData) {
        setSolution(solutionData)
        
        // ดึงเนื้อหาเฉลย
        const { data: solutionFile, error: solutionFileError } = await supabase.storage
          .from('teacher_solutions')
          .download(solutionData.file_path)
        
        if (solutionFileError) throw solutionFileError
        
        const solutionText = await solutionFile.text()
        setSolutionContent(solutionText)
      }
      
      // 4. ดึงเนื้อหาไฟล์งานที่นักเรียนส่ง
      const { data: submissionFile, error: submissionFileError } = await supabase.storage
        .from('student_submissions')
        .download(submissionData.file_path)
      
      if (submissionFileError) throw submissionFileError
      
      const submissionText = await submissionFile.text()
      setSubmissionContent(submissionText)
      
      // 5. ดึงข้อมูลคะแนน (ถ้ามี)
      if (submissionData.is_graded) {
        const { data: gradeData, error: gradeError } = await supabase
          .from('grades')
          .select('*')
          .eq('submission_id', submissionId)
          .single()
        
        if (!gradeError) {
          setGrade(gradeData)
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('ไม่สามารถดึงข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleGraded = async (result) => {
    try {
      setIsSaving(true)
      setSaveSuccess(false)
      
      const gradeData = {
        submission_id: submissionId,
        teacher_id: user.id,
        score: result.score,
        max_score: 100,
        feedback: result.gradingResult,
        llm_feedback: JSON.stringify({
          keyPoints: result.keyPoints,
          gradingResult: result.gradingResult,
          has_rag_context: result.has_rag_context || false
        }),
        graded_at: new Date()
      }
      
      // บันทึกผลการตรวจ
      const { data: savedGrade, error: gradeError } = await supabase
        .from('grades')
        .upsert(gradeData)
        .select()
      
      if (gradeError) throw gradeError
      
      // อัปเดตสถานะการตรวจงาน
      const { error: submissionError } = await supabase
        .from('student_submissions')
        .update({ is_graded: true })
        .eq('id', submissionId)
      
      if (submissionError) throw submissionError
      
      setGrade(savedGrade[0])
      setSaveSuccess(true)
      
      // อัปเดตข้อมูลในหน้าจอ
      setSubmission(prev => ({ ...prev, is_graded: true }))
    } catch (error) {
      console.error('Error saving grade:', error)
      setError('ไม่สามารถบันทึกผลการตรวจได้')
    } finally {
      setIsSaving(false)
    }
  }

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

  // แปลงข้อความ markdown เป็น HTML
  const renderMarkdown = (text) => {
    if (!text) return { __html: '' }
    return { __html: marked(text) }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ตรวจงานนักเรียน</h1>
          <button 
            onClick={() => router.push('/submissions')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับไปยังรายการงาน
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">กำลังโหลดข้อมูล...</span>
        </div>
      ) : error ? (
        <Card>
          <div className="p-4 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        </Card>
      ) : (
        <>
          {/* ข้อมูลงานและนักเรียน */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
              <div>
                <h2 className="text-lg font-bold">{assignment.name}</h2>
                <p className="text-gray-600">{assignment.subjects.name}</p>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>คำอธิบาย:</strong></p>
                  <p className="whitespace-pre-wrap mt-1">{assignment.description}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">ข้อมูลนักเรียน</h3>
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">{submission.student_name}</p>
                  <p className="text-sm text-gray-600">รหัสนักเรียน: {submission.student_id}</p>
                  <p className="text-sm text-gray-600">วันที่ส่ง: {formatDate(submission.uploaded_at)}</p>
                  <p className="text-sm text-gray-600">ชื่อไฟล์: {submission.file_name}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    สถานะ: {submission.is_graded ? 
                      <span className="text-green-600 font-medium">ตรวจแล้ว</span> : 
                      <span className="text-yellow-600 font-medium">รอตรวจ</span>
                    }
                  </p>
                  
                  {grade && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-md">
                      <p className="text-blue-800 font-medium">
                        คะแนน: {grade.score}/{grade.max_score}
                      </p>
                      <p className="text-xs text-gray-600">
                        ตรวจเมื่อ: {formatDate(grade.graded_at)}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/student_submissions/${submission.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    เปิดไฟล์งาน
                  </a>
                </div>
              </div>
            </div>
          </Card>
          
          {/* ระบบตรวจงาน */}
          {!solution ? (
            <Card>
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                <h3 className="font-medium">ไม่พบเฉลยสำหรับงานนี้</h3>
                <p className="mt-1 text-sm">กรุณาเพิ่มเฉลยในหน้าจัดการงานก่อนตรวจงานนักเรียน</p>
              </div>
            </Card>
          ) : (
            <>
              {/* แสดงข้อความบันทึกสำเร็จถ้ามีการบันทึก */}
              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
                  บันทึกผลการตรวจสำเร็จ
                </div>
              )}
              
              {/* คอมโพเนนต์ตรวจงาน */}
              <SubmissionGrader
                assignmentId={assignment.id}
                submissionId={submissionId}
                question={assignment.description}
                solutionContent={solutionContent}
                submissionContent={submissionContent}
                onGraded={handleGraded}
              />
              
              {/* แสดงผลการตรวจเดิม ถ้ามี */}
              {grade && (
                <Card className="mt-6">
                  <h3 className="text-lg font-medium mb-3">ผลการตรวจล่าสุด</h3>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">ตรวจเมื่อ: {formatDate(grade.graded_at)}</span>
                    <span className="text-xl font-bold">{grade.score}/{grade.max_score}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="prose max-w-none" dangerouslySetInnerHTML={renderMarkdown(grade.feedback)} />
                  </div>
                  
                  {grade.llm_feedback && (
                    <div className="mt-4">
                      {(() => {
                        try {
                          const feedback = JSON.parse(grade.llm_feedback);
                          if (feedback.has_rag_context) {
                            return (
                              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                ใช้ RAG ในการตรวจคำตอบ: มีการใช้ Vector Database เพื่อช่วยในการตรวจ
                              </div>
                            );
                          }
                          return null;
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </AppLayout>
  )
}