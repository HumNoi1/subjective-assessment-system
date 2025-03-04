// File: lib/grading.js
import { extractKeyPoints, compareSubmissionWithSolution, calculateSemanticSimilarity } from './analysis';
import { supabase } from './supabase-admin';

// ระบบให้คะแนนอัตโนมัติ
export async function autoGradeSubmission(assignmentId, submissionId) {
  try {
    // 1. ดึงข้อมูลโจทย์
    const { data: assignment } = await supabase
      .from('assignments')
      .select('description')
      .eq('id', assignmentId)
      .single();
    
    // 2. ดึงข้อมูลเฉลย
    const { data: solution } = await supabase
      .from('solutions')
      .select('file_path')
      .eq('assignment_id', assignmentId)
      .single();
    
    // 3. ดึงข้อมูลคำตอบนักเรียน
    const { data: submission } = await supabase
      .from('student_submissions')
      .select('file_path, teacher_id')
      .eq('id', submissionId)
      .single();
    
    // 4. ดึงเนื้อหาไฟล์เฉลยและคำตอบ
    const { data: solutionFile } = await supabase.storage
      .from('teacher_solutions')
      .download(solution.file_path);
    
    const { data: submissionFile } = await supabase.storage
      .from('student_submissions')
      .download(submission.file_path);
    
    const solutionContent = await solutionFile.text();
    const submissionContent = await submissionFile.text();
    
    // 5. สกัดประเด็นสำคัญจากเฉลย
    const keyPoints = await extractKeyPoints(solutionContent);
    
    // 6. เปรียบเทียบและวิเคราะห์คำตอบอย่างละเอียด
    const analysisResult = await compareSubmissionWithSolution(
      assignment.description,
      keyPoints,
      solutionContent,
      submissionContent
    );
    
    // 7. ดึงคะแนนจากผลการวิเคราะห์
    const scoreMatch = analysisResult.match(/สรุปคะแนนรวมทั้งหมด.*?(\d+)/s);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    // 8. บันทึกผลคะแนนลงฐานข้อมูล
    const { data: grade } = await supabase
      .from('grades')
      .upsert({
        submission_id: submissionId,
        teacher_id: submission.teacher_id,
        score: score,
        max_score: 100,
        feedback: analysisResult,
        llm_feedback: JSON.stringify({ keyPoints, analysisResult }),
        graded_at: new Date()
      })
      .select();
    
    // 9. อัปเดตสถานะการตรวจงาน
    await supabase
      .from('student_submissions')
      .update({ is_graded: true })
      .eq('id', submissionId);
    
    return {
      success: true,
      grade: grade[0],
      analysisResult,
      keyPoints
    };
  } catch (error) {
    console.error('Error auto-grading submission:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ระบบให้คะแนนย่อยตามประเด็นสำคัญ
export async function gradeByKeyPoints(keyPoints, submissionContent) {
  try {
    // แปลง keyPoints จากข้อความเป็นอาเรย์ของประเด็น
    const keyPointsArray = parseKeyPoints(keyPoints);
    const results = [];
    
    // ให้คะแนนแต่ละประเด็น
    for (const point of keyPointsArray) {
      // วัดความคล้ายคลึงเชิงความหมาย
      const similarity = await calculateSemanticSimilarity(
        point.description,
        submissionContent
      );
      
      // คำนวณคะแนนตามความคล้ายคลึง
      const pointScore = Math.round(similarity * point.weight);
      
      results.push({
        point: point.title,
        maxScore: point.weight,
        score: pointScore,
        similarity: similarity,
        description: point.description
      });
    }
    
    // คำนวณคะแนนรวม
    const totalScore = results.reduce((sum, item) => sum + item.score, 0);
    
    return {
      pointsBreakdown: results,
      totalScore
    };
  } catch (error) {
    console.error('Error grading by key points:', error);
    throw error;
  }
}

// แปลงข้อความประเด็นสำคัญเป็นอาเรย์
function parseKeyPoints(keyPointsStr) {
  // ใช้ regex หรือ LLM เพื่อแยกประเด็นและน้ำหนักคะแนน
  // นี่เป็นตัวอย่างอย่างง่าย
  const lines = keyPointsStr.split('\n');
  const points = [];
  
  let currentTitle = '';
  let currentDesc = '';
  let currentWeight = 0;
  
  for (const line of lines) {
    const weightMatch = line.match(/\((\d+).*?คะแนน\)/i);
    if (weightMatch) {
      if (currentTitle) {
        points.push({
          title: currentTitle,
          description: currentDesc,
          weight: currentWeight
        });
      }
      
      currentTitle = line.replace(/\((\d+).*?คะแนน\)/i, '').trim();
      currentDesc = '';
      currentWeight = parseInt(weightMatch[1]);
    } else if (line.trim() && currentTitle) {
      currentDesc += line.trim() + ' ';
    }
  }
  
  if (currentTitle) {
    points.push({
      title: currentTitle,
      description: currentDesc,
      weight: currentWeight
    });
  }
  
  return points;
}