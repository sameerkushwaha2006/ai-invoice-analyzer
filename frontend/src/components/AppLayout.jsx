// AppLayout.jsx
import React from 'react';

const AppLayout = ({ children, userName, onLogout }) => {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-purple-50 to-teal-50 font-sans text-gray-800 overflow-x-hidden flex flex-col">
      {/* Soft Blur Background Effects for Mobile & Desktop */}
      <div className="absolute top-[-5%] left-[-10%] w-[70%] sm:w-[40%] h-[30%] sm:h-[40%] rounded-full bg-purple-300/30 blur-[90px] sm:blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-10%] w-[70%] sm:w-[40%] h-[30%] sm:h-[40%] rounded-full bg-teal-300/30 blur-[90px] sm:blur-[120px] pointer-events-none"></div>
      
      {/* Mobile Optimized Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-teal-400 shadow-md"></div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-800">
              Nexus<span className="text-purple-600 font-light">AI</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-6">
            {userName ? (
              <>
                <span className="text-xs sm:text-sm font-medium text-gray-600 truncate max-w-[120px] sm:max-w-none">
                  Hi, {userName}
                </span>
                <button 
                  onClick={onLogout}
                  className="text-xs sm:text-sm font-bold bg-purple-100/70 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-full sm:bg-transparent sm:p-0 sm:text-purple-600 sm:hover:text-purple-800 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                Invoice AI
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-start sm:justify-center px-3 py-4 sm:p-6 relative z-10 w-full">
        {children}
      </main>

      {/* Minimalist Footer */}
      <footer className="w-full bg-white/30 backdrop-blur-md border-t border-white/50 py-4 sm:py-6 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} NexusAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;