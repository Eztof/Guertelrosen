import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";

export function Layout() {
  const nav = useNavigate();
  const { session } = useSession();

  async function logout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    nav("/login");
  }

  return (
    <div className="container">
      <div className="card">
        <div className="topbar">
          <div className="col" style={{ gap: 4 }}>
            <div className="h1">Kampagnenverwaltung – 7G</div>
            <div className="small">
              {session?.user?.email ? `Angemeldet als ${session.user.email}` : ""}
            </div>
          </div>

          <div className="row">
            <button className="btn" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="row" style={{ padding: "12px 16px", justifyContent: "space-between" }}>
          <div className="nav">
            <NavLink to="/app" end className={({ isActive }) => (isActive ? "active" : "")}>
              Start
            </NavLink>
            <NavLink to="/app/npcs" className={({ isActive }) => (isActive ? "active" : "")}>
              NSCs
            </NavLink>
          </div>

          <div className="small">Erstmal: NSC-Liste (später Erweiterungen wie im Wiki)</div>
        </div>
      </div>

      <div className="space" />

      <Outlet />
    </div>
  );
}