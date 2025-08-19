import React from 'react';
import { useNavigate } from 'react-router-dom';
import horizontalLogo from './assets/images/horizondal-logo.png';

const App = () => {
  const navigate = useNavigate();
  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Minimalist */}
      <header className="w-full py-6 px-8 flex justify-between items-center">
        <img src={horizontalLogo} alt="NeoRetail" className="h-10" />
        <button
          onClick={handleLoginClick}
          className="text-white font-medium py-2 px-6 rounded-md text-sm transition-all duration-200 hover:shadow-md"
          style={{ backgroundColor: '#3d857f' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2d6b65'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3d857f'}
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Modern Retail <span style={{ color: '#3d857f' }}>Reinvented</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-lg">
              NeoRetail is the all-in-one platform that transforms your supermarket operations with AI-powered insights, seamless inventory management, and an intuitive point-of-sale system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleLoginClick}
                className="text-white px-6 py-3 rounded-md font-medium text-sm shadow-sm hover:shadow-md transition-all"
                style={{ backgroundColor: '#3d857f' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2d6b65'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3d857f'}
              >
                Get Started
              </button>
              <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-md font-medium text-sm transition-all">
                Learn More
              </button>
            </div>
          </div>

          {/* Image - More professional */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-xl transform rotate-1" style={{ backgroundColor: 'rgba(61, 133, 127, 0.1)' }}></div>
            <img
              src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
              alt="Retail dashboard"
              className="relative rounded-lg shadow-lg w-full h-auto object-cover"
            />
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-6 px-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} NeoRetail. All rights reserved.
      </footer>
    </div>
  );
};

export default App;