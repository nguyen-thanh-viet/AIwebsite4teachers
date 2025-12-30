
import React, { useState } from 'react';
import { getQuizByCode } from '../services/quizService';
import { Quiz } from '../types';
import QuizDisplay from './QuizDisplay';

const StudentView: React.FC = () => {
  const [code, setCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!code.trim()) {
      setError("Vui lòng nhập mã Quiz.");
      return;
    }
    if (!studentName.trim()) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }
    
    setLoading(true);
    try {
      const found = await getQuizByCode(code.trim());
      if (found) {
        setQuiz(found);
        setError(null);
      } else {
        setError("Không tìm thấy mã Quiz này trên hệ thống Cloud.");
      }
    } catch (err) {
      setError("Lỗi kết nối tới Firebase.");
    } finally {
      setLoading(false);
    }
  };

  if (quiz) {
    return <QuizDisplay quiz={quiz} studentName={studentName} onExit={() => setQuiz(null)} />;
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 mt-10">
      <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden p-10 text-center border border-gray-100">
        <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-3">
          <i className="fas fa-rocket text-4xl text-indigo-600"></i>
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-2">Vào phòng thi</h2>
        <p className="text-gray-500 mb-10">Dữ liệu được đồng bộ hóa từ Cloud Firebase.</p>
        
        <div className="space-y-4 mb-8">
          <input 
            type="text" 
            placeholder="Họ và tên của bạn"
            className="w-full p-5 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:border-indigo-500 outline-none font-bold"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="MÃ QUIZ (Vd: ABC123)"
            className="w-full p-5 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:border-indigo-500 outline-none font-mono font-black uppercase text-center tracking-widest text-indigo-600"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          />
          {error && (
            <div className="text-red-500 text-sm font-bold bg-red-50 py-3 px-4 rounded-2xl">
              <i className="fas fa-exclamation-triangle mr-2"></i> {error}
            </div>
          )}
        </div>

        <button 
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-black py-5 rounded-2xl shadow-xl disabled:opacity-50"
        >
          {loading ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-play-circle mr-3"></i>}
          Bắt đầu ngay
        </button>
      </div>
    </div>
  );
};

export default StudentView;
