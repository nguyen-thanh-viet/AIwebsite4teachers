
import React, { useState } from 'react';
import { AppMode } from './types';
import Navbar from './components/Navbar';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);

  const renderContent = () => {
    switch (mode) {
      case AppMode.TEACHER:
        return <TeacherView />;
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
                onClick={() => setMode(AppMode.TEACHER)}
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
      <Navbar mode={mode} setMode={setMode} />
      <main className="animate-fade-in">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
