import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./useAuth.js";

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();

    try {
      await resetPassword({ email });
      setMessage("If an account exists for this email, a password reset email has been sent.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to send password reset email. Please try again.");
    }
  };

  return (
    <div>
      <h1>Reset Password</h1>

      <p>Enter your email address and we will send you a password reset link.</p>

      <form onSubmit={handleResetPassword}>
        <div>
          <label htmlFor="reset-email">Email</label>
          <br />
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">Send reset email</button>
      </form>

      {message && <p>{message}</p>}

      <p>
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;