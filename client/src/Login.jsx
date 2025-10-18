import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import horizontalLogo from './assets/images/horizondal-logo.png';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('https://neoretail.onrender.com//login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      toast.error('Invalid response from server', { position: 'top-center' });
      return;
    }

    if (response.ok) {
      const { token, user } = data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set flag to indicate this is a new login (for loader display)
      sessionStorage.setItem('isNewLogin', 'true');

      toast.success(`Welcome ${user.name}`, { position: 'top-center' });

      setTimeout(() => {
        const roleLower = user.role.toLowerCase();
        if (roleLower === 'admin') {
          navigate('/admin');
        } else if (roleLower === 'manager') {
          navigate('/manager');
        } else if (roleLower === 'staff') {
          navigate('/staff');
        } else {
          toast.error('Unknown user role!', { position: 'top-center' });
        }
      }, 2000);
    } else {
      // ⚠️ Show actual backend message (403, 401, etc.)
      const errorMessage = data.message || 'Login failed';
      const statusText = response.statusText || '';
      
      // Special handling for account blocked errors (403)
      if (response.status === 403 && data.unlockTime) {
        const fullErrorMessage = `${errorMessage}`;
        toast.error(fullErrorMessage, { 
          position: 'top-center',
          autoClose: 5000, // Show for 5 seconds
          hideProgressBar: false
        });
        
        // Also show additional info in console for debugging
        console.log('Account blocked details:', {
          unlockTime: data.unlockTime,
          remainingMinutes: data.remainingMinutes,
          blockedUntil: data.blockedUntil
        });
      } else {
        const fullErrorMessage = `${errorMessage}${statusText ? ` (${response.status}: ${statusText})` : ''}`;
        toast.error(fullErrorMessage, { position: 'top-center' });
      }
      
      // Log detailed error for debugging
      console.error('Login failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    }
  } catch (err) {
    // console.error('Login error:', err);
    
    // Handle different types of errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      toast.error('Network error: Unable to connect to server', { position: 'top-center' });
    } else if (err.name === 'SyntaxError') {
      toast.error('Invalid response from server', { position: 'top-center' });
    } else {
      toast.error(`Login error: ${err.message || 'Unknown error occurred'}`, { position: 'top-center' });
    }
  }
};


  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to bottom right, rgba(61, 133, 127, 0.2), rgba(61, 133, 127, 0.2))' }}></div>
        <img 
          className="h-full w-full object-cover relative z-0" 
          src="./src/assets/images/vertical-logo.png" 
          alt="Retail dashboard" 
        />
        {/* Overlay content */}
        {/* <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <h1 className="text-4xl font-bold mb-4">NeoRetail</h1>
            <p className="text-lg opacity-90">Admin Dashboard</p>
          </div>
        </div> */}
      </div>
    
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="text-center mb-6 lg:hidden">
            <img src={horizontalLogo} alt="NeoRetail" className="h-12 mx-auto mb-2" />
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ background: 'linear-gradient(to bottom right, #3d857f, #2d6b65)' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your NeoRetail account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter your username" 
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    style={{ '--tw-ring-color': '#3d857f' }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #3d857f'}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                    required 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    style={{ '--tw-ring-color': '#3d857f' }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #3d857f'}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <a 
                  href="#" 
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#3d857f' }}
                  onMouseEnter={(e) => e.target.style.color = '#2d6b65'}
                  onMouseLeave={(e) => e.target.style.color = '#3d857f'}
                >
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button 
                type="submit" 
                className="w-full text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ 
                  background: 'linear-gradient(to right, #3d857f, #2d6b65)',
                  '--tw-ring-color': '#3d857f'
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #3d857f, 0 0 0 4px rgba(61, 133, 127, 0.3)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              >
                Sign In
              </button>
              {loginMessage && (
                <div className="mt-4 text-center text-sm font-semibold" style={{ color: loginMessage === 'Login successful' ? '#2d6b65' : 'red' }}>
                  {loginMessage}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Secure admin access to NeoRetail dashboard
              </p>
            </div>
          </div>
        </div>
        <ToastContainer
          position="top-center"
          toastClassName={() =>
            "relative flex p-4 min-h-10 rounded-xl justify-between overflow-hidden cursor-pointer shadow-lg bg-gradient-to-r from-[#3d857f] to-[#2d6b65]"
          }
          bodyClassName={() =>
            "text-white text-base font-semibold flex items-center"
          }
          closeButton={true}
          autoClose={2000}
        />
      </div>
    </div>
  );
};

export default Login; 