// components/dashboard/AssessmentStatsChart.jsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AssessmentStatsChart({ subjectId, termId }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase.rpc('get_assessment_stats', {
          p_subject_id: subjectId,
          p_term_id: termId
        });
        
        if (error) throw error;
        
        // Transform data for chart
        const transformedData = data.map(item => ({
          scoreRange: `${item.score_min}-${item.score_max}`,
          count: item.student_count,
          avgConfidence: item.avg_confidence
        }));
        
        setStats(transformedData);
      } catch (err) {
        console.error('Error fetching assessment stats:', err);
        setError('ไม่สามารถดึงข้อมูลสถิติได้');
      } finally {
        setLoading(false);
      }
    };
    
    if (subjectId && termId) {
      fetchStats();
    }
  }, [subjectId, termId]);
  
  if (loading) {
    return <div className="h-80 flex items-center justify-center">กำลังโหลดข้อมูล...</div>;
  }
  
  if (error) {
    return <div className="h-80 flex items-center justify-center text-red-500">{error}</div>;
  }
  
  if (stats.length === 0) {
    return <div className="h-80 flex items-center justify-center">ไม่มีข้อมูลสถิติสำหรับวิชาและเทอมที่เลือก</div>;
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">สถิติการประเมิน</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stats}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="scoreRange" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" name="จำนวนนักเรียน" fill="#8884d8" />
            <Bar yAxisId="right" dataKey="avgConfidence" name="ความมั่นใจเฉลี่ย (%)" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}