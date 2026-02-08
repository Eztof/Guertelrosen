import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabase, getRememberPreference, persistSessionIfNeeded, setRememberPreference } from "../lib/supabase";
import { ErrorBox } from "../components/Ui";

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [remember, setRemember] = useState(getRememberPreference());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      setRememberPreference(remember);

      const sb = getSupabase();
      const { data, error: signInError } = await sb.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      persistSessionIfNeeded(data.session ?? null);
      nav("/app");
    } catch (err: any) {
      setError(err?.message ?? "Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="h1">Login</div>
        <div className="space" />

        {error ? <ErrorBox message={error} /> : null}
        {error ? <div className="space" /> : null}

        <form onSubmit={onSubmit} className="col">
          <div>
            <div className="label">E-Mail</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div>
            <div className="label">Passwort</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <label className="row" style={{ gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className="small">Gerät merken (angemeldet bleiben)</span>
          </label>

          <button className="btn btnPrimary" disabled={loading}>
            {loading ? "Login…" : "Login"}
          </button>

          <div className="small">
            Kein Account? <Link to="/register">Registrieren</Link>
          </div>
        </form>
      </div>
    </div>
  );
}