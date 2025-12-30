
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuizQuestions = async (content: string, count: number, difficulty: string): Promise<Question[]> => {
  const difficultyMap: Record<string, string> = {
    'EASY': 'Dễ (câu hỏi nhận biết, thông hiểu)',
    'MEDIUM': 'Trung bình (câu hỏi vận dụng thấp)',
    'HARD': 'Khó (câu hỏi vận dụng cao, yêu cầu suy luận sâu)'
  };

  const prompt = `Hãy tạo một bộ câu hỏi trắc nghiệm gồm ${count} câu với mức độ ${difficultyMap[difficulty] || 'Trung bình'} dựa trên nội dung sau:
  
  "${content}"
  
  Yêu cầu cực kỳ quan trọng về định dạng:
  - Nếu nội dung có công thức toán học (biểu thức, số mũ, phân số, vector, tích phân, căn thức, v.v.), hãy bắt buộc sử dụng cú pháp LaTeX.
  - Sử dụng $ ... $ cho công thức nằm trên cùng một dòng (inline math).
  - Sử dụng $$ ... $$ cho các công thức quan trọng cần hiển thị riêng biệt (block math).
  - Mỗi câu hỏi phải có 4 phương án lựa chọn.
  - Chỉ có 1 phương án đúng.
  - Trả về kết quả dưới định dạng JSON mảng các đối tượng.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Mảng 4 phương án lựa chọn"
            },
            correctAnswerIndex: {
              type: Type.INTEGER,
              description: "Vị trí của phương án đúng (0-3)"
            }
          },
          required: ["question", "options", "correctAnswerIndex"]
        }
      }
    }
  });

  try {
    const questionsData = JSON.parse(response.text?.trim() || "[]");
    return questionsData.map((q: any, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));
  } catch (error) {
    console.error("Lỗi parse JSON từ AI:", error);
    throw new Error("Không thể tạo câu hỏi từ AI. Vui lòng thử lại.");
  }
};
