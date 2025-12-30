
import React from 'react';
import { AppMode } from '../types';

interface NavbarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Navbar: React.FC<NavbarProps> = ({ mode, setMode }) => {
  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center cursor-pointer" onClick={() => setMode(AppMode.HOME)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white mr-3">
              <i className="fas fa-brain text-xl"></i>
            </div>
            <span className="text-xl font-bold text-gray-800">AI Quiz Pro</span>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => setMode(AppMode.TEACHER)}
              className={`px-4 py-2 rounded-md font-medium transition-all ${mode === AppMode.TEACHER ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-indigo-600'}`}
            >
              <i className="fas fa-chalkboard-teacher mr-2"></i>
              Giáo viên
            </button>
            <button 
              onClick={() => setMode(AppMode.STUDENT)}
              className={`px-4 py-2 rounded-md font-medium transition-all ${mode === AppMode.STUDENT ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-indigo-600'}`}
            >
              <i className="fas fa-user-graduate mr-2"></i>
              Học sinh
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
