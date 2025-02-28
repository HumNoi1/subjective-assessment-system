// app/dashboard/page.js
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/nextAuthConfig";
import { supabase } from "@/lib/supabase/client";
import DashboardStats from "@/components/dashboard/DashboardStats";
import RecentAssessments from "@/components/dashboard/RecentAssessments";
import ClassesList from "@/components/dashboard/ClassesList";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/auth/signin");
  }

  // ดึงข้อมูลสถิติจาก Supabase
  const { data: stats, error: statsError } = await supabase.rpc('get_teacher_stats', {
    teacher_id: session.user.id
  });

  // ดึงการประเมินล่าสุด
  const { data: recentAssessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select(`
      assessment_id,
      score,
      confidence,
      is_approved,
      created_at,
      student_answers (
        student_id,
        file_name,
        student: students (name)
      ),
      answer_keys (
        subject_id,
        subjects (subject_name)
      )
    `)
    .eq('approved_by', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // ดึงชั้นเรียนที่สอน
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select(`
      class_id,
      class_name,
      academic_year,
      students: students (count)
    `)
    .eq('teacher_id', session.user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">แดชบอร์ดอาจารย์</h1>
      
      <DashboardStats stats={stats || {}} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">การประเมินล่าสุด</h2>
          <RecentAssessments assessments={recentAssessments || []} />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">ชั้นเรียนของคุณ</h2>
          <ClassesList classes={classes || []} />
        </div>
      </div>
    </div>
  );
}