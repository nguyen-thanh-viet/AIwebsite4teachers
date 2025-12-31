
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
  const [selectedResults, setSelectedResults] = useState<QuizResult[]>([]);
  const [fetchingQuizzes, setFetchingQuizzes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tempQuestions.length > 0 && (window as any).MathJax) {
      (window as any).MathJax.typesetPromise?.();
    }
  }, [tempQuestions, editingId]);

  const loadQuizzes = async () => {
    if (activeTab === 'stats' || activeTab === 'delete') {
      setFetchingQuizzes(true);
      try {
        const [qs, allRes] = await Promise.all([getQuizzes(), getAllResults()]);
        
        const quizzesWithResults = qs.filter(q => {
          if (!allRes) return false;
          return Object.prototype.hasOwnProperty.call(allRes, q.id);
        });
        
        setMyQuizzes(quizzesWithResults.sort((a, b) => (b.createdAt as number || 0) - (a.createdAt as number || 0)));
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
    setSelectedQuizId(id);
    setSelectedResults([]); 
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
        <>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <i className="fas fa-pen-nib mr-3"></i> Thiết lập đề thi
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3">Nội dung đề thi:</label>
                <div className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <textarea
                    className="w-full h-40 p-4 border-b border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder={isRecording ? "🔴 Đang nghe..." : "Nhập nội dung kiến thức..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    readOnly={isRecording}
                  />
                  <div className="flex items-center justify-between p-2 bg-gray-50/50">
                    <div className="flex items-center space-x-1">
                      <button onClick={handleFileButtonClick} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-all"><i className="fas fa-upload mr-2"></i> Tải file</button>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
                      <button onClick={handleMicToggle} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isRecording ? 'bg-red-100 text-red-700 animate-pulse' : 'text-gray-700 hover:bg-gray-200'}`}>
                        <i className={`fas ${isRecording ? 'fa-stop-circle' : 'fa-microphone'} mr-2`}></i> {isRecording ? "Dừng" : "Ghi âm"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3">Mức độ khó:</label>
                <div className="flex p-1 bg-gray-100 rounded-xl space-x-1">
                  {['EASY', 'MEDIUM', 'HARD'].map((id) => (
                    <button key={id} onClick={() => setDifficulty(id)} className={`flex-1 py-3 rounded-lg font-bold transition-all ${difficulty === id ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500'}`}>
                      {id === 'EASY' ? 'Dễ' : id === 'MEDIUM' ? 'Trung bình' : 'Khó'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Số câu hỏi:</label>
                  <input type="number" min="2" max="20" value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-full p-3 border rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Thời gian (phút):</label>
                  <input type="number" min="1" max="180" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} className="w-full p-3 border rounded-lg outline-none" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleGenerate} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg h-[50px] disabled:opacity-50">
                    {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-magic mr-2"></i>} Tạo đề AI
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>
          </div>

          {tempQuestions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-t-4 border-green-500 animate-fade-in">
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h3 className="text-xl font-black text-gray-800"><i className="fas fa-eye mr-2 text-indigo-600"></i> Xem trước đề thi</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportQuizToWord(tempQuestions)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-md flex items-center"><i className="fas fa-file-word mr-2"></i> Word</button>
                  <button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center"><i className="fas fa-rocket mr-2"></i> Lưu & Phát hành</button>
                </div>
              </div>

              <div className="space-y-6">
                {tempQuestions.map((q, idx) => (
                  <div key={q.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                    <span className="absolute -left-3 top-6 w-8 h-8 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg flex items-center justify-center font-black shadow-sm z-10">{idx + 1}</span>
                    <div className="flex justify-between items-start mb-4 pl-4">
                      <p className="font-bold text-gray-800">{q.question}</p>
                      <button onClick={() => startEditing(q)} className="text-indigo-500 hover:text-indigo-700"><i className="fas fa-edit"></i></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`p-3 rounded-xl border text-sm ${oIdx === q.correctAnswerIndex ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-200'}`}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
             <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                <h3 className="text-xl font-bold text-gray-800">Đề thi đã có bài làm</h3>
             </div>
             <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
               {fetchingQuizzes ? (
                 <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-2xl text-indigo-600"></i></div>
               ) : myQuizzes.length === 0 ? (
                 <div className="p-10 text-center text-gray-400">Chưa có đề thi nào có học sinh nộp bài.</div>
               ) : (
                 myQuizzes.map(q => (
                   <div 
                     key={q.id} 
                     onClick={() => handleViewResults(q.id)}
                     className={`p-5 flex justify-between items-center cursor-pointer hover:bg-indigo-50/50 transition-all ${selectedQuizId === q.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                   >
                     <div className="flex-grow">
                       <div className="font-mono text-xl font-black text-indigo-600">{q.id}</div>
                       <div className="text-xs text-gray-400 mt-1">{q.questions.length} câu • {q.timeLimitMinutes}p</div>
                     </div>
                     <i className="fas fa-chevron-right text-gray-300 pr-2"></i>
                   </div>
                 ))
               )}
             </div>
          </div>

          {selectedQuizId && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-2xl font-black text-gray-800 mb-6">Kết quả chi tiết: {selectedQuizId}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-sm uppercase font-bold border-b">
                      <th className="pb-4 px-4">Học sinh</th>
                      <th className="pb-4 px-4">Điểm</th>
                      <th className="pb-4 px-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResults.length === 0 ? (
                      <tr><td colSpan={3} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
                    ) : (
                      selectedResults.map(r => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-4 px-4 font-bold">{r.studentName}</td>
                          <td className="py-4 px-4 text-indigo-600 font-black">{r.score}/{r.totalQuestions}</td>
                          <td className="py-4 px-4 text-sm text-gray-400">{new Date(r.timestamp).toLocaleString('vi-VN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'delete' && (
         <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-red-100">
             <div className="bg-red-50 border-b border-red-100 px-6 py-4">
                <h3 className="text-xl font-bold text-red-800 flex items-center">
                  <i className="fas fa-exclamation-triangle mr-3"></i> Xóa vĩnh viễn đề thi
                </h3>
             </div>
             <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
               {fetchingQuizzes ? (
                 <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-2xl text-indigo-600"></i></div>
               ) : myQuizzes.length === 0 ? (
                 <div className="p-10 text-center text-gray-400">Không có đề thi nào để xóa.</div>
               ) : (
                 myQuizzes.map(q => {
                   const isConfirming = confirmingDeleteId === q.id;
                   const isDeleting = deletingId === q.id;
                   return (
                     <div 
                       key={q.id} 
                       className="p-5 flex justify-between items-center"
                     >
                       <div>
                         <div className="font-mono text-xl font-black text-gray-700">{q.id}</div>
                         <div className="text-xs text-gray-400 mt-1">{q.questions.length} câu • {q.timeLimitMinutes}p</div>
                       </div>
                       <button 
                         type="button"
                         onClick={(e) => handleDeleteRequest(e, q.id)}
                         className={`font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center min-w-[140px] justify-center
                          ${isConfirming ? 'bg-yellow-400 hover:bg-yellow-500 text-black' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                         title="Xóa vĩnh viễn"
                         disabled={isDeleting}
                       >
                         {isDeleting ? <i className="fas fa-spinner fa-spin"></i> : 
                          isConfirming ? 'Xác nhận?' : <span><i className="fas fa-trash-alt mr-2"></i> Xóa</span>
                         }
                       </button>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        </div>
      )}

      {quizCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl scale-up">
            <h3 className="text-3xl font-black text-gray-800 mb-2">Đã lưu lên Cloud!</h3>
            <div className="bg-indigo-600 rounded-3xl p-6 mb-8 mt-6 relative group">
              <span className="text-5xl font-mono font-black text-white tracking-widest">{quizCode}</span>
              <button onClick={handleCopyCode} className="absolute top-2 right-2 p-2 text-white bg-white/20 hover:bg-white/40 rounded-xl transition-all">
                {copied ? <span className="text-[10px] uppercase font-bold">OK!</span> : <i className="fas fa-copy"></i>}
              </button>
            </div>
            <button onClick={() => setQuizCode(null)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold transition-all hover:bg-black">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherView;
