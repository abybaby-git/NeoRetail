import React from 'react';
import horizontalLogo from '../assets/images/horizondal-logo.png';

const AdvancedLoader = ({ role = 'admin' }) => {
  // Role-based color schemes
  const colorSchemes = {
    admin: {
      primary: '#3d857f',
      secondary: '#2d6b65',
      accent: '#4a9a94',
      light: '#e6f3f2'
    },
    manager: {
      primary: '#3d857f',
      secondary: '#2d6b65',
      accent: '#4a9a94',
      light: '#e6f3f2'
    },
    staff: {
      primary: '#3d857f',
      secondary: '#2d6b65',
      accent: '#4a9a94',
      light: '#e6f3f2'
    }
  };

  const colors = colorSchemes[role] || colorSchemes.admin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full" style={{ background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})` }}></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full" style={{ background: `linear-gradient(45deg, ${colors.secondary}, ${colors.primary})` }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 rounded-full" style={{ background: `linear-gradient(45deg, ${colors.accent}, ${colors.primary})` }}></div>
      </div>

      {/* Main Loader Container */}
      <div className="relative z-10 text-center">
        {/* Logo Section */}
        <div className="mb-8">
          <div className="relative">
            {/* Logo with glow effect */}
            <div className="relative inline-block">
              <div 
                className="absolute inset-0 rounded-2xl blur-xl opacity-30 animate-pulse"
                style={{ background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})` }}
              ></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
                <img 
                  src={horizontalLogo} 
                  alt="NeoRetail" 
                  className="h-16 w-auto mx-auto"
                />
              </div>
            </div>
          </div>
          
          {/* Company Name */}
          <h1 className="text-3xl font-bold mt-4 mb-2" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NeoRetail
          </h1>
          <p className="text-sm text-gray-600 font-medium">
            {role === 'admin' && 'Super Admin Dashboard'}
            {role === 'manager' && 'Store Manager Dashboard'}
            {role === 'staff' && 'Staff Dashboard'}
          </p>
        </div>

        {/* Loading Animation */}
        <div className="mb-8">
          {/* Main Spinner */}
          <div className="relative inline-block">
            {/* Outer Ring */}
            <div 
              className="w-16 h-16 border-4 rounded-full animate-spin"
              style={{ 
                borderColor: `${colors.light}`,
                borderTopColor: colors.primary,
                borderRightColor: colors.secondary
              }}
            ></div>
            
            {/* Inner Ring */}
            <div 
              className="absolute top-2 left-2 w-12 h-12 border-3 rounded-full animate-spin"
              style={{ 
                borderColor: `${colors.light}`,
                borderTopColor: colors.secondary,
                borderRightColor: colors.accent,
                animationDirection: 'reverse',
                animationDuration: '1.5s'
              }}
            ></div>
            
            {/* Center Dot */}
            <div 
              className="absolute top-6 left-6 w-4 h-4 rounded-full animate-pulse"
              style={{ background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})` }}
            ></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-700">Initializing Dashboard</p>
          <div className="flex items-center justify-center space-x-1">
            <div className="flex space-x-1">
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  background: colors.primary,
                  animationDelay: '0ms'
                }}
              ></div>
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  background: colors.secondary,
                  animationDelay: '150ms'
                }}
              ></div>
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  background: colors.accent,
                  animationDelay: '300ms'
                }}
              ></div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Please wait while we load your personalized dashboard...</p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-2 rounded-full animate-pulse"
              style={{ 
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-400">
          <p>Powered by NeoRetail Management System</p>
          <p className="mt-1">© 2024 NeoRetail. All rights reserved.</p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating Icons */}
        <div className="absolute top-1/4 right-1/4 animate-float">
          <div className="w-8 h-8 rounded-lg opacity-20" style={{ background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})` }}>
            <svg className="w-full h-full text-white p-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            </svg>
          </div>
        </div>
        
        <div className="absolute bottom-1/4 right-1/3 animate-float" style={{ animationDelay: '1s' }}>
          <div className="w-6 h-6 rounded-lg opacity-20" style={{ background: `linear-gradient(45deg, ${colors.secondary}, ${colors.accent})` }}>
            <svg className="w-full h-full text-white p-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
        </div>
        
        <div className="absolute top-1/2 left-1/4 animate-float" style={{ animationDelay: '2s' }}>
          <div className="w-4 h-4 rounded-lg opacity-20" style={{ background: `linear-gradient(45deg, ${colors.accent}, ${colors.primary})` }}>
            <svg className="w-full h-full text-white p-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AdvancedLoader; 