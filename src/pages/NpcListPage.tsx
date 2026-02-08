import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabase } from "../lib/supabase";
import type { Npc } from "../types/npc";
import { ErrorBox, Spinner } from "../components/Ui";

export function NpcListPage() {
  const [items, setItems] = useState<Npc[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("npcs")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as Npc[]);
    } catch (err: any) {
      setError(err?.message ?? "Konnte NSCs nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((n) => {
      const hay = [
        n.name,
        n.aka ?? "",
        n.species ?? "",
        n.culture ?? "",
        n.profession ?? "",
        n.titles ?? "",
        (n.tags ?? []).join(" ")
      ].join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  if (loading) return <Spinner />;

  return (
    <div className="card">
      <div className="section">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className="col" style={{ gap: 6 }}>
            <div className="h1">NSCs</div>
            <div className="p">Liste aller NSCs. Suche funktioniert über Name, Titel, Spezies, Tags…</div>
          </div>

          <div className="row">
            <Link to="/app/npcs/new">
              <button className="btn btnPrimary">+ Neuer NSC</button>
            </Link>
          </div>
        </div>

        <div className="space" />

        {error ? <ErrorBox message={error} /> : null}
        {error ? <div className="space" /> : null}

        <div className="row">
          <input
            className="input"
            placeholder="Suche… (z.B. Name, Titel, Spezies, Tag)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={load}>Neu laden</button>
        </div>

        <div className="space" />

        <div className="col" style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="p">Keine NSCs gefunden.</div>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className="card" style={{ borderRadius: 12, padding: 12, background: "rgba(16,19,27,.65)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="col" style={{ gap: 4 }}>
                    <div style={{ fontWeight: 800 }}>{n.name}</div>
                    <div className="small">
                      {(n.profession || n.species || n.culture) ? (
                        <>
                          {n.profession ? n.profession : ""}
                          {n.profession && (n.species || n.culture) ? " • " : ""}
                          {n.species ? n.species : ""}
                          {n.species && n.culture ? " • " : ""}
                          {n.culture ? n.culture : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <Link to={`/app/npcs/${n.id}`}>
                      <button className="btn">Ansehen</button>
                    </Link>
                    <Link to={`/app/npcs/${n.id}/edit`}>
                      <button className="btn">Bearbeiten</button>
                    </Link>
                  </div>
                </div>

                {n.titles ? <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>{n.titles}</div> : null}
                {n.tags && n.tags.length > 0 ? (
                  <div className="small" style={{ marginTop: 6 }}>Tags: {n.tags.join(", ")}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}