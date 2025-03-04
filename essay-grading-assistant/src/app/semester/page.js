// File: app/semesters/page.js
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'
import Card from '@/components/Card'
import { supabase } from '@/lib/supabase'

export default function Semesters() {
  const { user } = useAuth()
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSemester, setNewSemester] = useState({ name: '', year: new Date().getFullYear() })
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchSemesters()
    }
  }, [user])

  const fetchSemesters = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('teacher_id', user.id)
        .order('year', { ascending: false })
        .order('name', { ascending: false })

      if (error) throw error
      setSemesters(data || [])
    } catch (error) {
      console.error('Error fetching semesters:', error)
      setError('ไม่สามารถดึงข้อมูลเทอมได้')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSemester = async (e) => {
    e.preventDefault()
    try {
      setIsAdding(true)
      setError(null)
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (!newSemester.name || !newSemester.year) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      }
      
      const { data, error } = await supabase
        .from('semesters')
        .insert([{
          teacher_id: user.id,
          name: newSemester.name,
          year: newSemester.year
        }])
        .select()

      if (error) throw error
      
      setSemesters([...semesters, data[0]])
      setNewSemester({ name: '', year: new Date().getFullYear() })
    } catch (error) {
      console.error('Error adding semester:', error)
      setError(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteSemester = async (id) => {