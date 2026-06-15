import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();

    try {
      await resetPassword({ email });

      setMessage(
        'If an account exists for this email, a password reset email has been sent.'
      );
    } catch (error) {
      console.error(error);

      setMessage('Unable to send password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-semibold text-white mb-3">
          Reset password
        </h1>

        <p className="text-white/50 text-lg mb-10">
          Enter your email and we&apos;ll send you a password reset link.
        </p>

        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-sm font-medium text-white/70 mb-2"
              >
                Email*
              </label>

              <input
                id="reset-email"
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
              Send reset email
            </button>

            {message && (
              <p className="text-center text-sm text-white/70">{message}</p>
            )}

            <p className="text-center text-white/50">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-medium text-white hover:text-blue-400 transition"
              >
                Back to login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
