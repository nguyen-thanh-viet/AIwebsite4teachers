
import React, { useState, useEffect, useRef } from 'react';
import { generateQuizQuestions } from '../services/geminiService';
import { saveQuiz, generateCode, getQuizzes, getResultsForQuiz, deleteQuizAndResults, getAllResults } from '../services/quizService';
import { exportQuizToWord } from '../services/exportService';
import { Question, Quiz, QuizResult } from '../types';

const TeacherView: React.FC = () => {
  const [content, setContent] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [timeLimit, setTimeLimit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
  const [quizCode, setQuizCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'stats' | 'delete'>('create');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Question | null>(null);

  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedResults, setSelectedResults] = useState<QuizResult[]>([]);
  const [fetchingQuizzes, setFetchingQuizzes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [showQuizContent, setShowQuizContent] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((tempQuestions.length > 0 || (selectedQuiz && showQuizContent)) && (window as any).MathJax) {
      (window as any).MathJax.typesetPromise?.();
    }
  }, [tempQuestions, editingId, selectedQuiz, showQuizContent]);

  const loadQuizzes = async () => {
    if (activeTab === 'stats' || activeTab === 'delete') {
      setFetchingQuizzes(true);
      try {
        const [qs, allRes] = await Promise.all([getQuizzes(), getAllResults()]);
        
        // Hiển thị tất cả đề thi trong tab stats để giáo viên có thể xem nội dung ngay cả khi chưa có kết quả
        setMyQuizzes(qs.sort((a, b) => (b.createdAt as number || 0) - (a.createdAt as number || 0)));
      } catch (err) {
        console.error("Lỗi khi tải danh sách đề:", err);
      } finally {
        setFetchingQuizzes(false);
      }
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [activeTab]);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'vi-VN';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setContent(prev => (prev ? prev.trim() + ' ' : '') + transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Lỗi nhận dạng giọng nói:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);
    
    recognitionRef.current = recognition;

    return () => recognitionRef.current?.abort();
  }, []);

  const handleMicToggle = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => setContent(event.target?.result as string);
      reader.readAsText(file);
      setError(null);
    } else if (file) {
      setError('Lỗi: Vui lòng chỉ tải lên file văn bản (.txt).');
    }
    if (e.target) e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung kiến thức.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuizCode(null);
    try {
      const qs = await generateQuizQuestions(content, count, difficulty);
      setTempQuestions(qs);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const code = generateCode();
    const newQuiz: Quiz = {
      id: code,
      title: "Bài trắc nghiệm mới",
      content,
      questions: tempQuestions,
      createdAt: Date.now(),
      timeLimitMinutes: timeLimit
    };
    setLoading(true);
    try {
      await saveQuiz(newQuiz);
      setQuizCode(code);
      setTempQuestions([]);
      setContent('');
    } catch (err) {
      setError("Không thể lưu đề thi lên Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (confirmingDeleteId === id) {
      if (deletingId) return;

      setDeletingId(id);
      try {
        await deleteQuizAndResults(id);
        if (selectedQuizId === id) {
          setSelectedQuizId(null);
          setSelectedQuiz(null);
          setSelectedResults([]);
        }
        setMyQuizzes(prev => prev.filter(q => q.id !== id));
        setConfirmingDeleteId(null);
      } catch (err) {
        console.error("Lỗi xóa đề:", err);
        alert("Lỗi hệ thống: Không thể xóa đề thi lúc này.");
      } finally {
        setDeletingId(null);
      }
    } else {
      setConfirmingDeleteId(id);
      setTimeout(() => {
        setConfirmingDeleteId(currentId => (currentId === id ? null : currentId));
      }, 4000);
    }
  };

  const handleViewResults = async (id: string) => {
    if (deletingId === id) return;
    const quiz = myQuizzes.find(q => q.id === id);
    setSelectedQuiz(quiz || null);
    setSelectedQuizId(id);
    setSelectedResults([]); 
    setShowQuizContent(false);
    try {
      const results = await getResultsForQuiz(id);
      setSelectedResults(results);
      setTimeout(() => {
        if ((window as any).MathJax) (window as any).MathJax.typesetPromise?.();
      }, 100);
    } catch (err) {
      console.error("Lỗi khi tải kết quả:", err);
    }
  };

  const handleCopyCode = () => {
    if (quizCode) {
      navigator.clipboard.writeText(quizCode);
      setCopied(true);
      setTimeout(() => {
        setQuizCode(null);
        setCopied(false);
      }, 1000);
    }
  };

  const startEditing = (q: Question) => {
    setEditingId(q.id);
    setEditForm({ ...q, options: [...q.options] });
  };

  const saveEdit = () => {
    if (editForm) {
      setTempQuestions(prev => prev.map(q => q.id === editForm.id ? editForm : q));
      setEditingId(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 max-w-lg mx-auto border border-gray-100">
        <button 
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:text-indigo-600'}`}
        >
          <i className="fas fa-plus-circle mr-2"></i> Tạo đề
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:text-indigo-600'}`}
        >
          <i className="fas fa-chart-bar mr-2"></i> Thống kê
        </button>
        <button 
          onClick={() => setActiveTab('delete')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'delete' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-gray-500 hover:text-red-600'}`}
        >
          <i className="fas fa-trash-alt mr-2"></i> Xóa đề
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="space-y-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
          <div>
            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Nội dung kiến thức</label>
            <div className="relative">
              <textarea 
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-indigo-500 outline-none min-h-[200px] text-lg font-medium"
                placeholder="Dán văn bản, bài tập hoặc lý thuyết vào đây..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <button 
                  onClick={handleMicToggle}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-400 hover:text-indigo-600 shadow-sm'}`}
                  title="Nhận diện giọng nói"
                >
                  <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                </button>
                <button 
                  onClick={handleFileButtonClick}
                  className="w-12 h-12 bg-white text-gray-400 hover:text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm transition-all"
                  title="Tải file .txt"
                >
                  <i className="fas fa-file-upload"></i>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Số lượng câu</label>
              <input 
                type="number" 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                min="1" max="20"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Độ khó</label>
              <select 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Thời gian (phút)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                min="1"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center">
              <i className="fas fa-exclamation-circle mr-3 text-xl"></i> {error}
            </div>
          )}

          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
          >
            {loading ? <><i className="fas fa-spinner fa-spin mr-3"></i> Đang tạo câu hỏi...</> : <><i className="fas fa-magic mr-3"></i> Soạn đề với AI</>}
          </button>

          {tempQuestions.length > 0 && (
            <div className="mt-12 space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-800">Bản thảo câu hỏi</h3>
                <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg">Lưu & Xuất bản</button>
              </div>
              {tempQuestions.map((q, idx) => (
                <div key={q.id} className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
                   <div className="flex justify-between mb-4">
                     <span className="font-bold text-indigo-600">Câu {idx + 1}</span>
                     <button onClick={() => startEditing(q)} className="text-gray-400 hover:text-indigo-600"><i className="fas fa-edit"></i></button>
                   </div>
                   <p className="text-lg font-medium text-gray-800 mb-4">{q.question}</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {q.options.map((opt, oIdx) => (
                       <div key={oIdx} className={`p-3 rounded-xl border ${oIdx === q.correctAnswerIndex ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white border-gray-100 text-gray-500'}`}>
                         {String.fromCharCode(65 + oIdx)}. {opt}
                       </div>
                     ))}
                   </div>
                </div>
              ))}
            </div>
          )}

          {quizCode && (
            <div className="mt-8 bg-indigo-600 p-8 rounded-[2.5rem] text-white text-center animate-bounce-in">
              <p className="text-indigo-100 font-bold uppercase tracking-widest mb-2">Mã đề thi của bạn</p>
              <div className="text-6xl font-black mb-6 tracking-tighter">{quizCode}</div>
              <button 
                onClick={handleCopyCode}
                className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg"
              >
                {copied ? 'ĐÃ COPY!' : 'COPY MÃ'}
              </button>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'stats' || activeTab === 'delete') && (
        <div className="space-y-4">
          {fetchingQuizzes ? (
            <div className="text-center py-20"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>
          ) : myQuizzes.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100 text-gray-400">
              <i className="fas fa-folder-open text-6xl mb-4"></i>
              <p className="text-xl font-bold">Chưa có đề thi nào được tạo.</p>
            </div>
          ) : (
            myQuizzes.map(quiz => (
              <div 
                key={quiz.id} 
                className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center transition-all hover:shadow-md ${selectedQuizId === quiz.id ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl mr-5">
                    {quiz.id.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-xl">{quiz.id}</h4>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-tighter">
                      {new Date(quiz.createdAt).toLocaleDateString('vi-VN')} • {quiz.questions.length} câu • {quiz.timeLimitMinutes}p
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {activeTab === 'stats' ? (
                    <>
                      <button 
                        onClick={() => handleViewResults(quiz.id)}
                        className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <i className="fas fa-poll mr-2"></i> Kết quả
                      </button>
                      <button 
                        onClick={() => exportQuizToWord(quiz.questions, quiz.id)}
                        className="bg-green-50 text-green-600 px-5 py-2.5 rounded-xl font-bold hover:bg-green-600 hover:text-white transition-all"
                      >
                        <i className="fas fa-file-word mr-2"></i> Word
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={(e) => handleDeleteRequest(e, quiz.id)}
                      disabled={deletingId === quiz.id}
                      className={`px-6 py-2.5 rounded-xl font-bold transition-all ${confirmingDeleteId === quiz.id ? 'bg-red-600 text-white scale-110' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'}`}
                    >
                      {deletingId === quiz.id ? <i className="fas fa-spinner fa-spin"></i> : confirmingDeleteId === quiz.id ? 'Xác nhận xóa?' : <><i className="fas fa-trash-alt mr-2"></i> Xóa</>}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {selectedQuizId && activeTab === 'stats' && (
            <div className="mt-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 animate-fade-in">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-800">Thống kê chi tiết: {selectedQuizId}</h3>
                <button onClick={() => setShowQuizContent(!showQuizContent)} className="text-indigo-600 font-bold underline">
                  {showQuizContent ? 'Ẩn nội dung đề' : 'Xem nội dung đề'}
                </button>
              </div>

              {showQuizContent && selectedQuiz && (
                <div className="mb-10 space-y-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  {selectedQuiz.questions.map((q, i) => (
                    <div key={i} className="border-b border-gray-200 pb-4 last:border-0">
                      <p className="font-bold text-gray-800 mb-2">{i+1}. {q.question}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {q.options.map((o, oi) => (
                          <div key={oi} className={oi === q.correctAnswerIndex ? 'text-green-600 font-bold' : 'text-gray-500'}>
                            {String.fromCharCode(65+oi)}. {o}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedResults.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-medium">Chưa có học sinh nào làm bài này.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-400 uppercase text-xs font-black tracking-widest border-b border-gray-100">
                        <th className="px-4 py-4">Thí sinh</th>
                        <th className="px-4 py-4">Điểm số</th>
                        <th className="px-4 py-4">Tỷ lệ</th>
                        <th className="px-4 py-4">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResults.sort((a,b) => b.score - a.score).map((res, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-all">
                          <td className="px-4 py-4 font-bold text-gray-700">{res.studentName}</td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full font-bold ${res.score / res.totalQuestions >= 0.8 ? 'bg-green-100 text-green-600' : res.score / res.totalQuestions >= 0.5 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                              {res.score}/{res.totalQuestions}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-black text-gray-800">{Math.round((res.score / res.totalQuestions) * 100)}%</td>
                          <td className="px-4 py-4 text-gray-400 text-sm">{new Date(res.timestamp).toLocaleString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingId && editForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-black text-gray-800 mb-6">Chỉnh sửa câu hỏi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Câu hỏi</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"
                  value={editForm.question}
                  onChange={(e) => setEditForm({...editForm, question: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                {editForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <button 
                      onClick={() => setEditForm({...editForm, correctAnswerIndex: idx})}
                      className={`w-10 h-10 rounded-xl font-bold transition-all ${editForm.correctAnswerIndex === idx ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>
                    <input 
                      type="text" 
                      className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-indigo-500 outline-none"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editForm.options];
                        newOpts[idx] = e.target.value;
                        setEditForm({...editForm, options: newOpts});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-3 mt-8">
              <button onClick={saveEdit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">Lưu thay đổi</button>
              <button onClick={cancelEdit} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherView;
