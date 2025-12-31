
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Quiz, QuizResult, Question } from '../types';
import { saveQuizResult } from '../services/quizService';

interface QuizDisplayProps {
  quiz: Quiz;
  studentName: string;
  onExit: () => void;
}

interface ShuffledQuestion extends Question {
  shuffledOptions: string[];
  newCorrectIndex: number;
}

const VIOLATION_LIMIT = 3;

const QuizDisplay: React.FC<QuizDisplayProps> = ({ quiz, studentName, onExit }) => {
  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Generate shuffled questions and options once when quiz starts
  const shuffledQuestions = useMemo(() => {
    // Adding explicit type to shuffleArray call to fix 'unknown' errors
    const qs = shuffleArray<Question>(quiz.questions).map((q: Question) => {
      // Create an array of objects to track original indices of options
      const optionObjects = q.options.map((text, index) => ({ text, originalIndex: index }));
      // Adding explicit type to shuffleArray call to fix 'unknown' errors
      const shuffledOptionsObjs = shuffleArray<{text: string, originalIndex: number}>(optionObjects);
      
      const shuffledOptions = shuffledOptionsObjs.map(o => o.text);
      const newCorrectIndex = shuffledOptionsObjs.findIndex(o => o.originalIndex === q.correctAnswerIndex);
      
      return {
        ...q,
        shuffledOptions,
        newCorrectIndex
      } as ShuffledQuestion;
    });
    return qs;
  }, [quiz]);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState((quiz.timeLimitMinutes || 10) * 60);
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const timerRef = useRef<any>(null);

  // MathJax integration: Typeset when component updates
  useEffect(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise?.();
    }
  }, [quiz, submitted, answers, shuffledQuestions]);
  
  const handleSubmit = useRef(() => {});

  handleSubmit.current = () => {
    if (submitted) return;
    let s = 0;
    shuffledQuestions.forEach(q => {
      if (answers[q.id] === q.newCorrectIndex) {
        s++;
      }
    });
    setScore(s);
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    const result: QuizResult = {
      id: `res-${Date.now()}`,
      quizId: quiz.id,
      studentName: studentName,
      score: s,
      totalQuestions: quiz.questions.length,
      timestamp: Date.now()
    };
    saveQuizResult(result);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  useEffect(() => {
    if (!submitted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && !submitted) {
      handleSubmit.current();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, submitted]);

  // Anti-cheat mechanism
  useEffect(() => {
    if (submitted) return;

    const handleViolation = (reason: string) => {
      const newCount = violationCount + 1;
      setViolationCount(newCount);
      
      if (newCount >= VIOLATION_LIMIT) {
        setWarningMessage(`Bạn đã vi phạm ${newCount} lần. Bài thi sẽ được nộp tự động.`);
        setShowViolationWarning(true);
        setTimeout(() => {
          handleSubmit.current();
          setShowViolationWarning(false); // Ẩn cảnh báo để hiển thị kết quả
        }, 2000);
      } else {
        setWarningMessage(`Cảnh báo: ${reason}. Đây là lần vi phạm ${newCount}/${VIOLATION_LIMIT}.`);
        setShowViolationWarning(true);
        setTimeout(() => {
          setShowViolationWarning(false);
        }, 3000);
      }
    };
    
    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger if mouse leaves the top of the viewport (towards tabs/URL bar)
      if (e.clientY <= 0) {
         handleViolation('Rời khỏi màn hình thi');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Chuyển sang tab khác');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [submitted, violationCount]);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const progress = (Object.keys(answers).length / quiz.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24">
       {showViolationWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg animate-scale-up">
            <i className="fas fa-exclamation-triangle text-5xl text-yellow-500 mb-4 animate-pulse"></i>
            <h3 className="text-xl font-bold text-gray-800 mb-2">CẢNH BÁO GIAN LẬN</h3>
            <p className="text-gray-600">{warningMessage}</p>
          </div>
        </div>
      )}

      <div className="sticky top-[64px] z-40 bg-white/80 backdrop-blur-md -mx-4 px-4 py-4 border-b border-gray-100 flex justify-between items-center mb-8 rounded-b-2xl shadow-sm">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl mr-4 ${timeLeft < 60 && !submitted ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}>
            <i className="fas fa-clock text-xl"></i>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Thời gian còn lại</p>
            <p className={`text-2xl font-black font-mono leading-none ${timeLeft < 60 && !submitted ? 'text-red-600' : 'text-gray-800'}`}>
              {submitted ? "00:00" : formatTime(timeLeft)}
            </p>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col items-end">
           <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Tiến độ</p>
           <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
           </div>
        </div>

        <button 
          onClick={onExit}
          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-1">Quiz: {quiz.id}</h2>
          <p className="text-gray-500 flex items-center">
             <i className="fas fa-user-circle mr-2"></i> Thí sinh: <span className="text-indigo-600 font-bold ml-1">{studentName}</span>
          </p>
        </div>
        <div className="text-sm font-medium bg-gray-100 text-gray-500 py-1 px-4 rounded-full">
           {quiz.questions.length} câu hỏi • AI Generated (Shuffled)
        </div>
      </div>

      {submitted && (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-10 mb-12 text-white text-center shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <p className="text-indigo-100 font-bold uppercase tracking-[0.3em] mb-4">Kết quả của {studentName}</p>
            <div className="text-8xl font-black mb-4 drop-shadow-lg">{Math.round((score / quiz.questions.length) * 100)}%</div>
            <div className="text-2xl font-medium mb-10 text-indigo-100">Bạn đã hoàn thành với {score}/{quiz.questions.length} điểm chính xác!</div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={onExit}
                className="bg-white text-indigo-700 px-10 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center"
              >
                <i className="fas fa-home mr-2"></i> Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-10">
        {shuffledQuestions.map((q, idx) => {
          const selected = answers[q.id];
          const isCorrect = selected === q.newCorrectIndex;
          
          return (
            <div key={q.id} className={`bg-white rounded-[2rem] p-8 shadow-xl border-4 transition-all duration-500 ${submitted ? (isCorrect ? 'border-green-400' : 'border-red-400 shadow-red-50') : 'border-white hover:border-indigo-100'}`}>
              <div className="flex items-start mb-8">
                <span className="flex-shrink-0 w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black mr-5 text-xl">
                  {idx + 1}
                </span>
                <p className="text-xl font-bold text-gray-800 leading-tight pt-1">{q.question}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {q.shuffledOptions.map((opt, oIdx) => {
                  let buttonStyle = "bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100";
                  if (selected === oIdx) {
                    buttonStyle = "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-[1.02]";
                  }
                  
                  if (submitted) {
                    if (oIdx === q.newCorrectIndex) {
                      buttonStyle = "bg-green-100 border-green-500 text-green-800 font-bold";
                    } else if (selected === oIdx) {
                      buttonStyle = "bg-red-100 border-red-500 text-red-800 font-bold opacity-100";
                    } else {
                      buttonStyle = "bg-gray-50 text-gray-300 border-transparent opacity-40";
                    }
                  }

                  return (
                    <button 
                      key={oIdx}
                      disabled={submitted}
                      onClick={() => handleSelect(q.id, oIdx)}
                      className={`flex items-center p-5 rounded-2xl text-left transition-all relative overflow-hidden group ${buttonStyle}`}
                    >
                      <span className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mr-5 font-bold flex-shrink-0 transition-all ${selected === oIdx ? 'bg-white text-indigo-600 border-white' : 'border-gray-200 text-gray-400 group-hover:border-indigo-300'}`}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="text-lg font-medium pr-8">{opt}</span>
                      
                      {submitted && oIdx === q.newCorrectIndex && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                          <i className="fas fa-check"></i>
                        </div>
                      )}
                      {submitted && selected === oIdx && oIdx !== q.newCorrectIndex && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg">
                          <i className="fas fa-times"></i>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => handleSubmit.current()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black py-5 px-8 rounded-full shadow-2xl transition-all transform hover:-translate-y-2 active:scale-95 flex items-center justify-center uppercase tracking-widest"
          >
            <i className="fas fa-paper-plane mr-3"></i>
            Nộp bài
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizDisplay;
