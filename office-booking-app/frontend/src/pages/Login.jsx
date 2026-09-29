import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

// Matches wireframe Screen 1 — Login.
// SSO button is disabled: out of scope for MVP per the schema doc's scoping note.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const { token } = await api.login(email, password);
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.status === 401 ? "Invalid email or password." : "Something went wrong.");
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">DeskBook</div>
      <div className="screen-body">
        <h2 style={{ fontSize: 15, textAlign: "center", marginBottom: 20 }}>Sign in to your account</h2>

        {error && <div className="error-text">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label">Email</label>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="field-label">Password</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn" type="submit">Log In</button>
        </form>

        <button className="btn-outline" disabled title="SSO deferred post-MVP">
          Continue with SSO (Post-MVP)
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-soft)", marginTop: 14 }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
