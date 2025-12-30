
import { Question } from "../types";

export const exportQuizToWord = (questions: Question[], quizCode?: string) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Đề thi AI Quiz Pro</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 30px; }
        .question { margin-bottom: 20px; font-weight: bold; }
        .options { margin-left: 20px; margin-bottom: 30px; }
        .option { margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class='header'>
        <h1>BÀI KIỂM TRA TRẮC NGHIỆM</h1>
        ${quizCode ? `<h3>Mã đề: ${quizCode}</h3>` : "<h3>Đề thi mẫu</h3>"}
        <p>Họ và tên: ............................................................ Lớp: .....................</p>
      </div>
  `;

  const footer = `
    </body>
    </html>
  `;

  const body = questions.map((q, idx) => {
    const optionsHtml = q.options.map((opt, oIdx) => {
      return `<div class='option'>${String.fromCharCode(65 + oIdx)}. ${opt}</div>`;
    }).join('');

    return `
      <div class='question'>Câu ${idx + 1}: ${q.question}</div>
      <div class='options'>${optionsHtml}</div>
    `;
  }).join('');

  const fullHtml = header + body + footer;
  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `De_Thi_${quizCode || 'AI_Quiz'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
