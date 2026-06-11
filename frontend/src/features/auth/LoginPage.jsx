import { useState } from "react";
import { useAuth } from "./useAuth.js";

function LoginPage() {
  const { currentUser, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await login({ email, password });
      setMessage("Logged in successfully!");
    } catch (error) {
      console.error(error);
      setMessage("Login failed. Check your email and password.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMessage("Logged out successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Logout failed.");
    }
  };

  return (
    <div>
      <h1>Login</h1>

      {currentUser && <p>Signed in as {currentUser.email}</p>}

      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">Login</button>
      </form>

      <br />

      <button type="button" onClick={handleLogout}>
        Logout
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default LoginPage;