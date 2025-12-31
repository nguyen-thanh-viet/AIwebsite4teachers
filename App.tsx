
import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import Navbar from './components/Navbar';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';
import { onAuthStateChangedListener, signInTeacher, signOutTeacher } from './services/quizService';
import { User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [emailInput, setEmailInput] = useState('teacher@quizapp.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setCurrentUser(user);
      if (user) {
        setMode(AppMode.TEACHER);
      }
    });
    return unsubscribe;
  }, []);


  const handleTeacherClick = () => {
    if (currentUser) {
      setMode(AppMode.TEACHER);
    } else {
      setPasswordError('');
      setPasswordInput('');
      setIsPasswordVisible(false);
      setShowPasswordModal(true);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setPasswordError('');
    try {
      await signInTeacher(emailInput, passwordInput);
      setShowPasswordModal(false);
    } catch (error: any) {
      console.error("Firebase Auth Error:", error); // Log lỗi chi tiết để debug
      if (error.code === 'auth/operation-not-allowed') {
        setPasswordError('Phương thức đăng nhập này chưa được kích hoạt trên Firebase.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setPasswordError('Email hoặc mật khẩu không chính xác.');
      } else {
        setPasswordError('Lỗi hệ thống. Vui lòng thử lại.');
      }
      setPasswordInput('');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleSignOut = async () => {
    await signOutTeacher();
    setMode(AppMode.HOME);
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.TEACHER:
        return currentUser ? <TeacherView /> : null;
      case AppMode.STUDENT:
        return <StudentView />;
      case AppMode.HOME:
      default:
        return (
          <div className="max-w-5xl mx-auto px-4 py-16 text-center">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
              Học tập thông minh <br/>
              <span className="text-indigo-600">Với sức mạnh AI</span>
            </h1>
            <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              Tạo đề thi trắc nghiệm chỉ trong vài giây từ bất kỳ tài liệu nào. <br/>
              Giải pháp tối ưu cho giáo viên và trải nghiệm hiện đại cho học sinh.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div 
                onClick={handleTeacherClick}
                className="group cursor-pointer bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-indigo-100 transform hover:-translate-y-2"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:rotate-6">
                  <i className="fas fa-chalkboard-teacher text-3xl text-indigo-600"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Dành cho Giáo viên</h3>
                <p className="text-gray-500">Dán nội dung bài giảng, chọn số lượng câu hỏi và để AI tự động soạn đề trắc nghiệm chuẩn xác.</p>
              </div>

              <div 
                onClick={() => setMode(AppMode.STUDENT)}
                className="group cursor-pointer bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-indigo-100 transform hover:-translate-y-2"
              >
                <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:-rotate-6">
                  <i className="fas fa-user-graduate text-3xl text-purple-600"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Dành cho Học sinh</h3>
                <p className="text-gray-500">Tham gia kiểm tra nhanh chóng bằng mã code. Giao diện mượt mà, trực quan và trả kết quả ngay lập tức.</p>
              </div>
            </div>
            
            <div className="mt-20 pt-10 border-t border-gray-100 text-gray-400 flex flex-col items-center">
               <div className="flex space-x-8 mb-4">
                  <div className="flex items-center"><i className="fas fa-bolt mr-2 text-yellow-400"></i> Nhanh chóng</div>
                  <div className="flex items-center"><i className="fas fa-shield-alt mr-2 text-green-400"></i> Chính xác</div>
                  <div className="flex items-center"><i className="fas fa-smile mr-2 text-pink-400"></i> Dễ sử dụng</div>
               </div>
               <p className="text-sm">© 2024 AI Quiz Pro. Powered by Gemini Flash 3.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar mode={mode} setMode={setMode} onTeacherClick={handleTeacherClick} currentUser={currentUser} onSignOut={handleSignOut} />
      <main className="animate-fade-in">
        {renderContent()}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl scale-up relative">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8">
              <i className="fas fa-times"></i>
            </button>
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-lock text-2xl text-indigo-600"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Đăng nhập Giáo viên</h3>
            <p className="text-gray-500 mb-6">Sử dụng tài khoản được cấp để truy cập.</p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                 <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-center font-bold outline-none focus:border-indigo-500"
                  placeholder="Email"
                  required
                />
                <div className="relative">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-center font-bold outline-none focus:border-indigo-500 pr-12"
                    placeholder="Mật khẩu"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-8 h-8"
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fas ${isPasswordVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl mt-4 transition-all disabled:opacity-50"
              >
                {isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : "Xác nhận"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
