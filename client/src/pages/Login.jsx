import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiLock, FiPackage, FiCheck, FiArrowRight, FiShield, FiUserPlus, FiUser } from 'react-icons/fi';

const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let success = false;
    
    if (isLoginMode) {
      success = await login(email, password);
    } else {
      success = await register(name, email, password, companyName);
    }
    
    setIsSubmitting(false);
    if (success) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setIsLoginMode(true);
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3">
          <div className="h-12 w-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 text-white">
            <FiPackage className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-black text-white tracking-tight">
          Dynamic Manufacturing Cost & Pricing Manager
        </h1>
        <p className="mt-1.5 text-center text-xs font-medium text-slate-400">
          Automated multi-level BOM costing, price propagation & enterprise margin control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-700">
          
          {/* Toggle Login / Register */}
          <div className="flex p-1 bg-slate-900/50 rounded-xl mb-6 border border-slate-700">
            <button
              type="button"
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLoginMode ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLoginMode ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Create Account
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLoginMode && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-500"
                    placeholder="Acme Manufacturing Inc."
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-500"
                placeholder={isLoginMode ? "admin@profit.com" : "you@company.com"}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-500"
                placeholder="••••••••"
              />
            </div>

            {/* Quick Fill Demo Credentials (Only in Login Mode) */}
            {isLoginMode && (
              <div className="pt-1">
                <span className="text-xs text-slate-400 font-medium block mb-2">1-Click Test Credentials:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@profit.com', 'admin123')}
                    className="px-3 py-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-semibold text-slate-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-primary-400">
                      <FiShield className="h-3 w-3" /> Admin (Full Access)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">admin@profit.com</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('user@profit.com', 'user123')}
                    className="px-3 py-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-semibold text-slate-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <FiCheck className="h-3 w-3" /> Cost Estimator
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">user@profit.com</div>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-600/30 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting 
                ? 'Processing...' 
                : isLoginMode 
                  ? <><FiLock className="mr-2 h-4 w-4" /> Sign In</> 
                  : <><FiUserPlus className="mr-2 h-4 w-4" /> Create Account</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
