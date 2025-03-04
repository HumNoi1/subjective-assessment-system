// File: lib/prompts.js
export const PROMPTS = {
    // Prompt ตรวจคำตอบของนักเรียนโดยเปรียบเทียบกับเฉลย
    GRADE_SUBMISSION: `คุณคือระบบผู้ช่วยตรวจข้อสอบอัตนัยแนวคิดวิศวกรรมซอฟต์แวร์ กรุณาตรวจคำตอบของนักเรียนและให้คะแนนตามเกณฑ์ต่อไปนี้:
  
  1. ความถูกต้องของคำตอบ (60%): คำตอบครอบคลุมประเด็นสำคัญทั้งหมดในเฉลยหรือไม่
  2. การใช้ภาษาและโครงสร้าง (20%): การใช้ภาษาทางเทคนิคถูกต้องและสื่อความหมายชัดเจน
  3. การประยุกต์ใช้และตัวอย่าง (20%): มีการยกตัวอย่างหรือการอธิบายที่แสดงถึงความเข้าใจเชิงลึก
  
  โจทย์: {question}
  
  เฉลยของอาจารย์:
  {teacher_solution}
  
  คำตอบของนักเรียน:
  {student_submission}
  
  กรุณาวิเคราะห์คำตอบโดยละเอียดในรูปแบบต่อไปนี้:
  1. สรุปคะแนนรวม: [0-100]
  2. การวิเคราะห์ความถูกต้อง: ประเด็นที่ตรงกับเฉลย ประเด็นที่ขาดหายไป หรือประเด็นที่ไม่ถูกต้อง
  3. ข้อเสนอแนะ: คำแนะนำเพื่อปรับปรุงคำตอบ
  
  ตอบเป็นภาษาไทย โดยให้เนื้อหามีความกระชับและตรงประเด็น`,
  
    // Prompt สร้างสรุปประเด็นสำคัญจากเฉลย
    EXTRACT_KEY_POINTS: `กรุณาสกัดประเด็นสำคัญจากเฉลยข้อสอบวิชาวิศวกรรมซอฟต์แวร์ต่อไปนี้ ให้แสดงเป็นรายข้อ พร้อมคำอธิบายสั้นๆ สำหรับแต่ละประเด็น:
  
  {teacher_solution}
  
  แสดงเฉพาะประเด็นสำคัญที่จำเป็นต้องมีในคำตอบ`,
  
    // Prompt รับทั้งโจทย์และเฉลย และให้ LLM ระบุเกณฑ์การให้คะแนน
    GENERATE_GRADING_RUBRIC: `คุณคือผู้เชี่ยวชาญด้านวิศวกรรมซอฟต์แวร์ กรุณาสร้างเกณฑ์การให้คะแนนสำหรับข้อสอบอัตนัยนี้:
  
  โจทย์: {question}
  
  เฉลยของอาจารย์:
  {teacher_solution}
  
  กรุณาสร้างเกณฑ์การให้คะแนนที่ละเอียดโดยแบ่งเป็นด้านต่างๆ ดังนี้:
  1. ความถูกต้องของเนื้อหา (แบ่งเป็นประเด็นย่อย)
  2. การใช้ภาษาและโครงสร้าง
  3. การวิเคราะห์และประยุกต์ใช้
  
  สำหรับแต่ละด้าน ให้ระบุว่าสิ่งใดคือสิ่งที่จำเป็นต้องมีในคำตอบและควรได้กี่คะแนน
  รวมคะแนนทั้งหมดเป็น 100 คะแนน`
  };
  
  // ฟังก์ชันสร้าง message สำหรับส่งไป LMStudio
  export function createGradingPrompt(question, teacherSolution, studentSubmission) {
    return [
      { role: 'system', content: 'คุณเป็นผู้ช่วยตรวจข้อสอบอัตนัยแนวคิดวิศวกรรมซอฟต์แวร์ที่มีความเชี่ยวชาญ' },
      {
        role: 'user',
        content: PROMPTS.GRADE_SUBMISSION
          .replace('{question}', question)
          .replace('{teacher_solution}', teacherSolution)
          .replace('{student_submission}', studentSubmission)
      }
    ];
  }
  
  export function createKeyPointsPrompt(teacherSolution) {
    return [
      { role: 'system', content: 'คุณเป็นผู้ช่วยวิเคราะห์เนื้อหาวิชาวิศวกรรมซอฟต์แวร์ที่มีความเชี่ยวชาญ' },
      {
        role: 'user',
        content: PROMPTS.EXTRACT_KEY_POINTS
          .replace('{teacher_solution}', teacherSolution)
      }
    ];
  }
  
  export function createRubricPrompt(question, teacherSolution) {
    return [
      { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญด้านวิศวกรรมซอฟต์แวร์และการออกข้อสอบ' },
      {
        role: 'user',
        content: PROMPTS.GENERATE_GRADING_RUBRIC
          .replace('{question}', question)
          .replace('{teacher_solution}', teacherSolution)
      }
    ];
  }