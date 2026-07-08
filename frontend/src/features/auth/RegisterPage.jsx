import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await register({
        username,
        email,
        password,
      });

      setMessage('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-semibold text-white mb-3">Sign up</h1>

        <p className="text-white/50 text-lg mb-10">
          Create your Claude Scholars account.
        </p>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="register-username" className="block text-sm font-medium text-white/70 mb-2">
                Username*
              </label>

              <input
                id="register-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              <label htmlFor="register-email" className="block text-sm font-medium text-white/70 mb-2">
                Email*
              </label>

              <input
                id="register-email"
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
              <label htmlFor="register-password" className="block text-sm font-medium text-white/70 mb-2">
                Password*
              </label>
              <input
                id="register-password"
                type="password"
                placeholder="Create a password"
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
              Get started
            </button>

            {message && (
              <p className="text-center text-sm text-red-400">{message}</p>
            )}
            <p className="text-center text-white/50">
              Already have an account?{' '}
              <a
                href="/login"
                className="font-medium text-white hover:text-blue-400 transition"
              >
                Log in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
