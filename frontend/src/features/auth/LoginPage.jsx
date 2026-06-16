import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setMessage('Login failed. Check your email and password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-semibold text-white mb-3">Log in</h1>

        <p className="text-white/50 text-lg mb-10">
          Welcome back to Claude Scholars.
        </p>

        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-white/70 mb-2"
              >
                Email*
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-white/5
                  px-4
                  py-4
                  text-white
                  placeholder:text-white/40
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-transparent
                "
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-white/70 mb-2"
              >
                Password*
              </label>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-white/5
                  px-4
                  py-4
                  text-white
                  placeholder:text-white/40
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-transparent
                "
              />
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="
                w-full
                rounded-xl
                bg-blue-600
                py-4
                text-white
                font-medium
                hover:bg-blue-500
                transition
              "
            >
              Log in
            </button>

            {message && (
              <p className="text-center text-sm text-red-400">{message}</p>
            )}

            <p className="text-center text-white/50">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-white hover:text-blue-400 transition"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
