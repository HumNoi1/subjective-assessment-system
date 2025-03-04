// File: lib/feedback.js
import { generateResponse } from './llm';

// สร้างข้อเสนอแนะโดยละเอียด
export async function generateFeedback(question, keyPoints, solutionContent, submissionContent, gradingResult) {
  const messages = [
    { role: 'system', content: 'คุณเป็นอาจารย์ที่ให้คำแนะนำที่สร้างสรรค์และเป็นประโยชน์ต่อนักเรียน' },
    {
      role: 'user',
      content: `สร้างข้อเสนอแนะที่เป็นประโยชน์สำหรับคำตอบของนักเรียน

โจทย์: ${question}

ประเด็นสำคัญที่ต้องมีในคำตอบ:
${keyPoints}

เฉลยโดยย่อ:
${solutionContent.substring(0, 500)}...

คำตอบของนักเรียน:
${submissionContent}

ผลการตรวจ:
${gradingResult}

กรุณาสร้างข้อเสนอแนะที่สร้างสรรค์และเป็นประโยชน์ โดย:
1. ชมเชยจุดแข็งของคำตอบ
2. ระบุจุดที่ต้องปรับปรุงอย่างละเอียด
3. ให้คำแนะนำเชิงปฏิบัติที่นักเรียนสามารถนำไปใช้ได้จริง
4. ยกตัวอย่างเพิ่มเติมหรือแนวทางการพัฒนาความรู้เพิ่มเติม`
    }
  ];

  return await generateResponse(messages, 0.7, 1024);
}

// สร้างคำอธิบายการให้คะแนนสั้นๆ
export async function generateScoreExplanation(score, gradingResult) {
  const messages = [
    { role: 'system', content: 'คุณเป็นอาจารย์ผู้เชี่ยวชาญในการอธิบายผลการเรียนรู้' },
    {
      role: 'user',
      content: `สรุปการให้คะแนน ${score}/100 พร้อมอธิบายเหตุผลสั้นๆ จากผลการตรวจต่อไปนี้:

${gradingResult}

ให้คำอธิบายที่กระชับ ไม่เกิน 3-4 ประโยค โดยเน้นจุดสำคัญที่สุดในการให้คะแนน`
    }
  ];

  return await generateResponse(messages, 0.5, 256);
}

// สร้างรายงานสรุปการตรวจ
export async function generateGradingSummary(assignmentInfo, submissions) {
  const messages = [
    { role: 'system', content: 'คุณเป็นนักวิเคราะห์ข้อมูลการศึกษาที่มีความเชี่ยวชาญ' },
    {
      role: 'user',
      content: `สร้างรายงานสรุปผลการตรวจงานดังนี้:

งาน: ${assignmentInfo.name}
คำอธิบาย: ${assignmentInfo.description}
จำนวนผู้ส่งงาน: ${submissions.length}

ข้อมูลคะแนน:
- คะแนนเฉลี่ย: ${calculateAverage(submissions.map(s => s.grade?.score || 0))}
- คะแนนสูงสุด: ${Math.max(...submissions.map(s => s.grade?.score || 0))}
- คะแนนต่ำสุด: ${Math.min(...submissions.map(s => s.grade?.score || 0))}

สร้างรายงานสรุปที่มีประโยชน์ต่ออาจารย์ผู้สอน โดยวิเคราะห์:
1. ภาพรวมความเข้าใจของนักเรียน
2. ประเด็นที่นักเรียนส่วนใหญ่เข้าใจดี
3. ประเด็นที่นักเรียนส่วนใหญ่ยังไม่เข้าใจหรือมีความเข้าใจคลาดเคลื่อน
4. ข้อเสนอแนะในการปรับปรุงการสอนหรือสื่อการสอน`
    }
  ];

  return await generateResponse(messages, 0.7, 1024);
}

// คำนวณค่าเฉลี่ย
function calculateAverage(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}