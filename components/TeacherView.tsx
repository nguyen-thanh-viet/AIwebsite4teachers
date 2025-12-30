
import React, { useState, useEffect, useRef } from 'react';
import { generateQuizQuestions } from '../services/geminiService';
import { saveQuiz, generateCode, getQuizzes, getResultsForQuiz } from '../services/quizService';
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
  const [activeTab, setActiveTab] = useState<'create' | 'stats'>('create');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Question | null>(null);

  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedResults, setSelectedResults] = useState<QuizResult[]>([]);
  const [fetchingQuizzes, setFetchingQuizzes] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tempQuestions.length > 0 && (window as any).MathJax) {
      (window as any).MathJax.typesetPromise?.();
    }
  }, [tempQuestions, editingId]);

  useEffect(() => {
    const loadQuizzes = async () => {
      if (activeTab === 'stats') {
        setFetchingQuizzes(true);
        try {
          const qs = await getQuizzes();
          setMyQuizzes(qs.sort((a, b) => (b.createdAt as number || 0) - (a.createdAt as number || 0)));
        } catch (err) {
          console.error("Lỗi khi tải danh sách đề:", err);
        } finally {
          setFetchingQuizzes(false);
        }
      }
    };
    loadQuizzes();
  }, [activeTab]);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Trình duyệt này không hỗ trợ nhận dạng giọng nói.");
      return;
    }

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
      setError(`Lỗi micro: ${event.error}. Vui lòng kiểm tra quyền truy cập.`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
    };
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
    if (file) {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setContent(event.target?.result as string);
        };
        reader.readAsText(file);
        setError(null);
      } else {
        setError('Lỗi: Vui lòng chỉ tải lên file văn bản (.txt).');
      }
    }
    if (e.target) {
      e.target.value = '';
    }
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

  const handleViewResults = async (id: string) => {
    setSelectedQuizId(id);
    try {
      const results = await getResultsForQuiz(id);
      setSelectedResults(results);
      setTimeout(() => {
          (window as any).MathJax.typesetPromise?.();
      }, 100);
    } catch (err) {
      console.error("Lỗi khi tải kết quả:", err);
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

  const updateEditFormOption = (index: number, value: string) => {
    if (editForm) {
      const newOptions = [...editForm.options];
      newOptions[index] = value;
      setEditForm({ ...editForm, options: newOptions });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 max-w-sm mx-auto border border-gray-100">
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
      </div>

      {activeTab === 'create' ? (
        <>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <i className="fas fa-pen-nib mr-3"></i>
                Thiết lập đề thi
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3">Nội dung đề thi:</label>
                <div className="rounded-2xl shadow-lg shadow-indigo-500/5 border border-gray-200 overflow-hidden">
                  <textarea
                    className="w-full h-40 p-4 border-b border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-gray-700 placeholder-gray-400"
                    placeholder={isRecording ? "🔴 Đang lắng nghe... Vui lòng nói rõ vào micro." : "Gõ nội dung, tải file, hoặc bắt đầu ghi âm..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    readOnly={isRecording}
                  />
                  <div className="flex items-center justify-between p-2 bg-gray-50/50">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={handleFileButtonClick}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-all flex items-center"
                        title="Tải lên file .txt"
                      >
                        <i className="fas fa-upload mr-2 opacity-60"></i> Tải file
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />

                      <button
                        onClick={handleMicToggle}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center ${isRecording ? 'bg-red-100 text-red-700 animate-pulse' : 'text-gray-700 hover:bg-gray-200'}`}
                        title={isRecording ? "Dừng ghi âm" : "Ghi âm từ microphone"}
                      >
                        {isRecording ? (
                          <><i className="fas fa-stop-circle mr-2"></i> Dừng</>
                        ) : (
                          <><i className="fas fa-microphone mr-2 opacity-60"></i> Ghi âm</>
                        )}
                      </button>
                    </div>
                    <span className="text-xs text-gray-400 pr-2">
                      Hỗ trợ file .txt & giọng nói tiếng Việt
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3">Mức độ khó:</label>
                <div className="flex p-1 bg-gray-100 rounded-xl space-x-1">
                  {[
                    { id: 'EASY', label: 'Dễ', icon: 'fa-smile', color: 'text-green-600' },
                    { id: 'MEDIUM', label: 'Trung bình', icon: 'fa-meh', color: 'text-yellow-600' },
                    { id: 'HARD', label: 'Khó', icon: 'fa-frown', color: 'text-red-600' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDifficulty(item.id)}
                      className={`flex-1 flex items-center justify-center py-3 rounded-lg font-bold transition-all ${difficulty === item.id ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                      <i className={`fas ${item.icon} mr-2 ${difficulty === item.id ? item.color : ''}`}></i>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Số lượng câu hỏi:</label>
                  <input 
                    type="number" 
                    min="2" max="20"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Thời gian (phút):</label>
                  <input 
                    type="number" 
                    min="1" max="180"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 h-[50px]"
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i>Đang tạo...</>
                    ) : (
                      <><i className="fas fa-magic mr-2"></i>Tạo đề AI</>
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>
          </div>

          {tempQuestions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-fade-in border-t-4 border-green-500">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4 gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-800 flex items-center">
                    <i className="fas fa-eye mr-2 text-indigo-600"></i>
                    Xem trước đề thi
                  </h3>
                  <p className="text-sm text-gray-500">Bạn có thể chỉnh sửa nội dung bên dưới trước khi lưu</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <button 
                    onClick={() => exportQuizToWord(tempQuestions)}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center whitespace-nowrap"
                    title="Tải đề thi dưới dạng file Word"
                  >
                    <i className="fas fa-file-word mr-2"></i>
                    Xuất Word
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all flex items-center justify-center whitespace-nowrap disabled:opacity-50"
                  >
                    {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-rocket mr-2"></i>}
                    Lưu & Phát hành
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {tempQuestions.map((q, idx) => (
                  <div key={q.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group transition-all">
                    <span className="absolute -left-3 top-6 w-8 h-8 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg flex items-center justify-center font-black shadow-sm z-10">
                      {idx + 1}
                    </span>
                    
                    {editingId === q.id ? (
                      <div className="pl-4 space-y-4">
                        <textarea 
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 font-bold"
                          value={editForm?.question}
                          onChange={(e) => setEditForm(prev => prev ? {...prev, question: e.target.value} : null)}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editForm?.options.map((opt, oIdx) => (
                            <input 
                              key={oIdx}
                              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={opt}
                              onChange={(e) => updateEditFormOption(oIdx, e.target.value)}
                            />
                          ))}
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                           <button onClick={cancelEdit} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Hủy</button>
                           <button onClick={saveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md">Lưu</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-4 pl-4">
                          <p className="font-bold text-gray-800 flex-grow">{q.question}</p>
                          <button onClick={() => startEditing(q)} className="ml-2 text-indigo-500 hover:text-indigo-700 p-2"><i className="fas fa-edit"></i></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className={`p-3 rounded-xl border text-sm flex items-center ${oIdx === q.correctAnswerIndex ? 'bg-green-50 border-green-300 text-green-800 font-semibold' : 'bg-white border-gray-200 text-gray-600'}`}>
                              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center mr-3 text-[10px] font-bold">{String.fromCharCode(65 + oIdx)}</span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
             <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Đề thi trên Cloud</h3>
             </div>
             <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
               {fetchingQuizzes ? (
                 <div className="p-10 text-center"><i className="fas fa-spinner fa-spin text-2xl text-indigo-600"></i></div>
               ) : myQuizzes.length === 0 ? (
                 <div className="p-10 text-center text-gray-400">Chưa có bài thi nào trên Cloud.</div>
               ) : (
                 myQuizzes.map(q => (
                   <div 
                     key={q.id} 
                     onClick={() => handleViewResults(q.id)}
                     className={`p-5 flex justify-between items-center cursor-pointer transition-all hover:bg-indigo-50/50 ${selectedQuizId === q.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                   >
                     <div>
                       <div className="font-mono text-xl font-black text-indigo-600">{q.id}</div>
                       <div className="text-xs text-gray-400 mt-1">
                         {q.questions.length} câu • {q.timeLimitMinutes}p
                       </div>
                     </div>
                     <i className="fas fa-chevron-right text-gray-300"></i>
                   </div>
                 ))
               )}
             </div>
          </div>

          {selectedQuizId && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-fade-in">
              <h3 className="text-2xl font-black text-gray-800 mb-6">Thống kê bài làm</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-sm uppercase font-bold">
                      <th className="pb-4 px-4">Học sinh</th>
                      <th className="pb-4 px-4">Điểm</th>
                      <th className="pb-4 px-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedResults.map(r => (
                      <tr key={r.id}>
                        <td className="py-4 px-4 font-bold">{r.studentName}</td>
                        <td className="py-4 px-4">{r.score}/{r.totalQuestions}</td>
                        <td className="py-4 px-4 text-sm text-gray-400">
                          {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {quizCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl animate-scale-up">
            <h3 className="text-3xl font-black text-gray-800 mb-2">Đã lưu lên Cloud!</h3>
            <div className="bg-indigo-600 rounded-3xl p-6 mb-8 mt-6 relative group">
              <span className="text-5xl font-mono font-black text-white tracking-[0.2em]">{quizCode}</span>
              <button 
                onClick={handleCopyCode}
                disabled={copied}
                className={`absolute top-2 right-2 p-2 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                title="Copy mã Quiz"
              >
                {copied ? (
                  <span className="text-[10px] font-bold px-1 uppercase whitespace-nowrap">Đã copy!</span>
                ) : (
                  <i className="fas fa-copy"></i>
                )}
              </button>
            </div>
            <button 
              onClick={() => setQuizCode(null)}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold transition-all hover:bg-black"
            >Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherView;
