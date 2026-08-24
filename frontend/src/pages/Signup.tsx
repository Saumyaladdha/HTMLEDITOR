import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../api/auth";

export default function Signup() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(email, password, displayName);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={onSubmit} className="card" style={{ width: 340, display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>अपना खाता बनाएं</h1>
        <input className="field" placeholder="Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="field" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" placeholder="Password (min 8 characters)" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error-text">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0 }}>
          पहले से खाता है? <Link to="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
