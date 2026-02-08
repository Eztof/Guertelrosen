import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabase";
import { ErrorBox, OkBox } from "../components/Ui";

export function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);

    try {
      const sb = getSupabase();
      const { data, error: signUpError } = await sb.auth.signUp({
        email,
        password
      });

      if (signUpError) throw signUpError;

      // Wenn Email-Confirm aktiv ist, ist session oft null
      if (data.session) {
        nav("/app");
      } else {
        setOk("Registriert. Falls Email-Bestätigung aktiv ist: bitte Mail prüfen und Link klicken, dann einloggen.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="h1">Registrieren</div>
        <div className="space" />

        {error ? <ErrorBox message={error} /> : null}
        {ok ? <OkBox message={ok} /> : null}
        {(error || ok) ? <div className="space" /> : null}

        <form onSubmit={onSubmit} className="col">
          <div>
            <div className="label">E-Mail</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div>
            <div className="label">Passwort</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <div className="small">Tipp: mindestens 8 Zeichen.</div>
          </div>

          <button className="btn btnPrimary" disabled={loading}>
            {loading ? "Erstelle…" : "Account erstellen"}
          </button>

          <div className="small">
            Schon registriert? <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}