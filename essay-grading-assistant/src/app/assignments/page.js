// File: app/assignments/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FileUploader from '@/components/FileUploader'
import FileList from '@/components/FileList'

export default function Assignments() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAssignment, setNewAssignment] = useState({ 
    name: '', 
    description: '', 
    subject_id: '' 
  })
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [showSolution, setShowSolution] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // ดึงข้อมูลวิชาเรียน
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id, 
          name,
          classes:classes(id, name, semesters:semesters(id, name, year))
        `)
        .eq('teacher_id', user.id)
        .order('name')

      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])
      
      // ดึงข้อมูลงานพร้อมข้อมูลวิชา - แก้ไขส่วนนี้
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects:subjects(id, name, classes:classes(id, name, semesters:semesters(id, name, year))),
          solutions:solutions(id, file_name, file_path, uploaded_at)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (assignmentsError) throw assignmentsError
      setAssignments(assignmentsData || [])
      
      // ตั้งค่า default subject_id ถ้ามีวิชาในระบบ
      if (subjectsData && subjectsData.length > 0) {
        setNewAssignment(prev => ({ ...prev, subject_id: subjectsData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('ไม่สามารถดึงข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAssignment = async (e) => {
    e.preventDefault()
    try {
      setIsAdding(true)
      setError(null)
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (!newAssignment.name || !newAssignment.description || !newAssignment.subject_id) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      }
      
      // แก้ไขการ query นี้
      const { data: insertedData, error } = await supabase
        .from('assignments')
        .insert([{
          teacher_id: user.id,
          name: newAssignment.name,
          description: newAssignment.description,
          subject_id: newAssignment.subject_id,
          created_at: new Date()
        }])
        .select()

      if (error) throw error
      
      // ดึงข้อมูลวิชาของงานใหม่
      const { data: subjectData } = await supabase
        .from('subjects')
        .select(`
          id, 
          name,
          classes:classes(id, name, semesters:semesters(id, name, year))
        `)
        .eq('id', newAssignment.subject_id)
        .single()
      
      // สร้างโฟลเดอร์สำหรับเก็บเฉลย
      const folderRes = await fetch('/api/storage/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacherId: user.id,
          assignmentId: insertedData[0].id,
          type: 'solution'
        })
      })
      
      if (!folderRes.ok) {
        console.error('Error creating solution folder');
      }
      
      // เพิ่มข้อมูลวิชาเข้าไปในงานใหม่
      const newAssignmentWithSubject = {
        ...insertedData[0],
        subjects: subjectData,
        solutions: []
      }
      
      // เพิ่มงานใหม่เข้าไปในรายการ
      setAssignments([newAssignmentWithSubject, ...assignments])
      setNewAssignment({ name: '', description: '', subject_id: newAssignment.subject_id })
    } catch (error) {
      console.error('Error adding assignment:', error)
      setError(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteAssignment = async (id) => {
    if (!confirm('คุณต้องการลบงานนี้ใช่หรือไม่? การลบงานจะทำให้ข้อมูลที่เกี่ยวข้องทั้งหมดถูกลบด้วย')) {
      return
    }
    
    try {
      setLoading(true)
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setAssignments(assignments.filter(assignment => assignment.id !== id))
      
      // ถ้างานที่ลบตรงกับงานที่กำลังแสดงเฉลยอยู่ ให้ยกเลิกการแสดง
      if (selectedAssignment && selectedAssignment.id === id) {
        setSelectedAssignment(null)
        setShowSolution(false)
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      setError('ไม่สามารถลบงานได้')
    } finally {
      setLoading(false)
    }
  }

  const handleSolutionUpload = async (uploadResult) => {
    if (!selectedAssignment) return
    
    try {
      // ตรวจสอบว่ามีเฉลยอยู่แล้วหรือไม่
      const { data: existingSolution } = await supabase
        .from('solutions')
        .select('id')
        .eq('assignment_id', selectedAssignment.id)
        .single();
      
      let data;
      
      if (existingSolution) {
        // ถ้ามีเฉลยอยู่แล้ว ให้อัปเดตแทน
        const { data: updatedData, error } = await supabase
          .from('solutions')
          .update({
            file_path: uploadResult.path,
            file_name: uploadResult.name,
            uploaded_at: new Date()
          })
          .eq('id', existingSolution.id)
          .select();
        
        if (error) throw error;
        data = updatedData[0];
      } else {
        // ถ้ายังไม่มีเฉลย ให้สร้างใหม่
        const { data: newData, error } = await supabase
          .from('solutions')
          .insert({
            teacher_id: user.id,
            assignment_id: selectedAssignment.id,
            file_path: uploadResult.path,
            file_name: uploadResult.name,
            uploaded_at: new Date()
          })
          .select();
        
        if (error) throw error;
        data = newData[0];
      }
      
      // อัปเดตข้อมูลในรายการงาน
      setAssignments(assignments.map(assignment => {
        if (assignment.id === selectedAssignment.id) {
          return {
            ...assignment,
            solutions: [data]
          }
        }
        return assignment
      }))
      
      // อัปเดตเฉลยใน selectedAssignment
      setSelectedAssignment({
        ...selectedAssignment,
        solutions: [data]
      })
      
      // สร้าง embedding สำหรับเฉลย
      const fileContent = await fetchFileContent(uploadResult.path)
      await createSolutionEmbedding(data.id, selectedAssignment.id, fileContent)
      
      alert('อัปโหลดเฉลยสำเร็จ')
    } catch (error) {
      console.error('Error saving solution:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกเฉลย: ' + error.message)
    }
  }

  const fetchFileContent = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('teacher_solutions')
        .download(filePath)
        
      if (error) throw error
      
      return await data.text()
    } catch (error) {
      console.error('Error fetching file content:', error)
      throw error
    }
  }

  // แก้ไขฟังก์ชัน createSolutionEmbedding ในไฟล์ assignments/page.js
const createSolutionEmbedding = async (solutionId, assignmentId, fileContent) => {
  try {
    console.log(`Creating embedding for solution ${solutionId}`);
    
    const response = await fetch('/api/embeddings/solution', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        solutionId,
        assignmentId,
        teacherId: user.id,
        fileContent
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Embedding API error:', errorData);
      throw new Error(errorData.message || 'Failed to create embedding');
    }
    
    const result = await response.json();
    console.log('Embedding created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating solution embedding:', error);
    // ไม่ throw error เพื่อให้การอัปโหลดยังทำงานต่อไปได้ แม้ embedding จะล้มเหลว
    return { status: 'error', message: error.message };
  }
}

  // ฟังก์ชันแสดงเทอม/ชั้นเรียน/วิชาของงาน
  const getAssignmentDetails = (assignment) => {
    if (!assignment.subjects) return '-'
    
    const subject = assignment.subjects
    const classItem = subject.classes
    const semester = classItem?.semesters
    
    let result = subject.name
    
    if (classItem && classItem.name) {
      result += ` (${classItem.name}`
      
      if (semester) {
        result += ` เทอม ${semester.name}/${semester.year}`
      }
      
      result += ')'
    }
    
    return result
  }

  const hasSolution = (assignment) => {
    return assignment.solutions && assignment.solutions.length > 0
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">งานและแบบทดสอบ</h1>
          <p className="text-gray-500">จัดการงานและแบบทดสอบทั้งหมด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-black">
        {/* Form เพิ่มงานใหม่ */}
        <Card title="เพิ่มงานใหม่">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}

          {subjects.length === 0 ? (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
              กรุณาเพิ่มวิชาเรียนก่อนเพิ่มงาน
            </div>
          ) : (
            <form onSubmit={handleAddAssignment}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่องาน
                </label>
                <input
                  type="text"
                  value={newAssignment.name}
                  onChange={(e) => setNewAssignment({ ...newAssignment, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="เช่น แบบทดสอบบทที่ 1, การบ้านครั้งที่ 2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  คำอธิบาย
                </label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[100px]"
                  placeholder="ระบุรายละเอียดของงานหรือโจทย์"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วิชา
                </label>
                <select
                  value={newAssignment.subject_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">เลือกวิชา</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.classes?.name || '-'})
                    </option>
                  ))}
                </select>
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
        
        {/* แสดงรายการงาน */}
        <div className="lg:col-span-2">
          <Card title="รายการงานและแบบทดสอบ">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">ยังไม่มีงานในระบบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 font-medium">ชื่องาน</th>
                      <th className="pb-2 font-medium">วิชา</th>
                      <th className="pb-2 font-medium">เฉลย</th>
                      <th className="pb-2 font-medium">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium">{assignment.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(assignment.created_at)}
                          </div>
                        </td>
                        <td className="py-3">{getAssignmentDetails(assignment)}</td>
                        <td className="py-3">
                          {hasSolution(assignment) ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              อัปโหลดแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              ยังไม่มีเฉลย
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedAssignment(assignment)
                                setShowSolution(true)
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              จัดการเฉลย
                            </button>
                            <Link
                              href={`/submissions?assignmentId=${assignment.id}`}
                              className="text-indigo-600 hover:text-indigo-800 text-sm"
                            >
                              ดูงานที่ส่ง
                            </Link>
                            <button
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              ลบ
                            </button>
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
        
        {/* จัดการเฉลย */}
        {showSolution && selectedAssignment && (
          <div className="lg:col-span-3">
            <Card 
              title={`จัดการเฉลย: ${selectedAssignment.name}`}
              footer={
                <button
                  onClick={() => setShowSolution(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ปิด
                </button>
              }
            >
              <div className="mb-4">
                <h3 className="font-medium mb-2">คำอธิบาย/โจทย์:</h3>
                <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                  {selectedAssignment.description}
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium mb-2">อัปโหลดเฉลย:</h3>
                <FileUploader 
                  type="solution" 
                  assignmentId={selectedAssignment.id}
                  onFileUploaded={handleSolutionUpload}
                />
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-2">เฉลยที่อัปโหลดแล้ว:</h3>
                <FileList 
                  type="solution" 
                  assignmentId={selectedAssignment.id}
                  onFileDeleted={() => {
                    // เมื่อลบไฟล์เฉลย ให้อัปเดตข้อมูลในรายการงาน
                    setAssignments(assignments.map(assignment => {
                      if (assignment.id === selectedAssignment.id) {
                        return {
                          ...assignment,
                          solutions: []
                        }
                      }
                      return assignment
                    }))
                    
                    // อัปเดต selectedAssignment
                    setSelectedAssignment({
                      ...selectedAssignment,
                      solutions: []
                    })
                  }}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}