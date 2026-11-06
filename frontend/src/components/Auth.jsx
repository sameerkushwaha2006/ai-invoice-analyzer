// Auth.jsx
import { useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://aiinvoicebackend.onrender.com";

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin
      ? `${API_BASE_URL}/login`
      : `${API_BASE_URL}/signup`;
    
    const bodyData = isLogin 
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      console.log(response.status);
      console.log(data);

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('userName', data.name);
          onLoginSuccess(data.name);
        } else {
          alert("Signup successful! Please login.");
          setIsLogin(true);
        }
      } else {
        setError(data.detail || "Something went wrong");
      }
    } catch (err) {
      console.log(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center items-center py-4 sm:py-12">
      <div className="bg-white/70 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-md border border-white/80">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-teal-600 mb-1.5">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start analyzing your invoices.'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-100 text-red-600 text-xs sm:text-sm text-center mb-5 p-3 rounded-xl font-medium shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 ml-1">Full Name</label>
              <input type="text" name="name" required onChange={handleChange}
                className="w-full p-3 sm:p-3.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-2xl focus:bg-white focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 outline-none transition-all text-sm text-gray-700 placeholder-gray-400 shadow-sm" 
                placeholder="John Doe" />
            </div>
          )}
          
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 ml-1">Email Address</label>
            <input type="email" name="email" required onChange={handleChange}
              className="w-full p-3 sm:p-3.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-2xl focus:bg-white focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 outline-none transition-all text-sm text-gray-700 placeholder-gray-400 shadow-sm" 
              placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 ml-1">Password</label>
            <input type="password" name="password" required onChange={handleChange}
              className="w-full p-3 sm:p-3.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-2xl focus:bg-white focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 outline-none transition-all text-sm text-gray-700 shadow-sm" 
              placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full mt-2 sm:mt-4 bg-gradient-to-r from-purple-600 to-teal-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-purple-500/25 active:scale-[0.98] sm:hover:scale-[1.01] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 sm:mt-8 pt-5 border-t border-gray-200/60 text-center">
          <p className="text-gray-500 text-xs sm:text-sm font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-purple-600 font-bold hover:text-teal-600 transition-colors">
              {isLogin ? 'Create one now' : 'Log in instead'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;