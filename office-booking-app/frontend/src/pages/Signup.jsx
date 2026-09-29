import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

// New screen — not in the original wireframe set, added so the app is
// self-contained for a demo (see conversation: SSO is still deferred
// post-MVP, but self-serve signup is worth having for reviewers/demos).
export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.register(name, email, password);
      // Auto-login right after registering, so it's one smooth flow.
      const { token } = await api.login(email, password);
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      if (err.status === 409) setError("That email is already registered.");
      else if (err.status === 400) setError("Please fill in all fields.");
      else setError("Something went wrong.");
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">DeskBook</div>
      <div className="screen-body">
        <h2 style={{ fontSize: 15, textAlign: "center", marginBottom: 20 }}>Create your account</h2>

        {error && <div className="error-text">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label">Name</label>
          <input
            className="field"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            minLength={8}
            required
          />

          <button className="btn" type="submit">Sign Up</button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-soft)", marginTop: 14 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
