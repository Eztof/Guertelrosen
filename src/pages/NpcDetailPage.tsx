import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSupabase } from "../lib/supabase";
import type { Npc } from "../types/npc";
import { ErrorBox, FieldRow, Spinner, formatDateISO, nonEmpty } from "../components/Ui";

export function NpcDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [npc, setNpc] = useState<Npc | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);

    try {
      const sb = getSupabase();
      const { data, error } = await sb.from("npcs").select("*").eq("id", id).single();
      if (error) throw error;
      setNpc(data as Npc);
    } catch (e: any) {
      setErr(e?.message ?? "Konnte NSC nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    const ok = confirm("Diesen NSC wirklich löschen?");
    if (!ok) return;

    const sb = getSupabase();
    const { error } = await sb.from("npcs").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    nav("/app/npcs");
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <Spinner />;

  if (err || !npc) {
    return (
      <div className="card">
        <div className="section">
          <ErrorBox message={err ?? "Nicht gefunden."} />
          <div className="space" />
          <Link to="/app/npcs"><button className="btn">Zurück zur Liste</button></Link>
        </div>
      </div>
    );
  }

  const hasAny = (...vals: Array<string | null | undefined>) => vals.some((v) => nonEmpty(v ?? ""));

  return (
    <div className="card">
      <div className="section">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="col" style={{ gap: 6 }}>
            <div className="h1">{npc.name}</div>
            {npc.titles ? <div className="p">{npc.titles}</div> : <div className="p">—</div>}
          </div>
          <div className="row">
            <Link to="/app/npcs"><button className="btn">Liste</button></Link>
            <Link to={`/app/npcs/${npc.id}/edit`}><button className="btn btnPrimary">Bearbeiten</button></Link>
            <button className="btn btnDanger" onClick={onDelete}>Löschen</button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ padding: 14, paddingTop: 0 }}>
        {/* Infobox (Wiki-artig) */}
        <div className="card infobox">
          <div className="title">{npc.name}</div>
          {npc.aka ? <div className="small">Auch bekannt als: {npc.aka}</div> : null}

          <div className="kv">
            {npc.species ? <FieldRow label="Spezies" value={npc.species} /> : null}
            {npc.culture ? <FieldRow label="Kultur" value={npc.culture} /> : null}
            {npc.profession ? <FieldRow label="Profession" value={npc.profession} /> : null}
            {npc.birth_date ? <FieldRow label="Geboren" value={formatDateISO(npc.birth_date)} /> : null}
            {npc.death_date ? <FieldRow label="Gestorben" value={formatDateISO(npc.death_date)} /> : null}
            {npc.birthplace ? <FieldRow label="Herkunft" value={npc.birthplace} /> : null}
            {npc.residence ? <FieldRow label="Wohnort" value={npc.residence} /> : null}
            {npc.affiliations ? <FieldRow label="Zugehörigkeit" value={npc.affiliations} /> : null}
            {npc.tags && npc.tags.length > 0 ? <FieldRow label="Tags" value={npc.tags.join(", ")} /> : null}
          </div>

          <div className="space" />
          <div className="small">Nur ausgefüllte Felder werden angezeigt.</div>
        </div>

        {/* Artikel-Content (Wiki-artig: nur wenn Inhalte da sind) */}
        <div className="card">
          {npc.description ? (
            <div className="section">
              <div className="h2">Kurzbeschreibung</div>
              <div className="space" />
              <div className="prewrap">{npc.description}</div>
            </div>
          ) : null}

          {npc.appearance ? (
            <div className="section">
              <div className="h2">Erscheinung</div>
              <div className="space" />
              <div className="prewrap">{npc.appearance}</div>
            </div>
          ) : null}

          {npc.personality ? (
            <div className="section">
              <div className="h2">Charakter & Auftreten</div>
              <div className="space" />
              <div className="prewrap">{npc.personality}</div>
            </div>
          ) : null}

          {npc.biography ? (
            <div className="section">
              <div className="h2">Biographie</div>
              <div className="space" />
              <div className="prewrap">{npc.biography}</div>
            </div>
          ) : null}

          {npc.abilities ? (
            <div className="section">
              <div className="h2">Fähigkeiten</div>
              <div className="space" />
              <div className="prewrap">{npc.abilities}</div>
            </div>
          ) : null}

          {npc.equipment ? (
            <div className="section">
              <div className="h2">Ausrüstung</div>
              <div className="space" />
              <div className="prewrap">{npc.equipment}</div>
            </div>
          ) : null}

          {npc.relationships ? (
            <div className="section">
              <div className="h2">Beziehungen</div>
              <div className="space" />
              <div className="prewrap">{npc.relationships}</div>
            </div>
          ) : null}

          {npc.notes ? (
            <div className="section">
              <div className="h2">Notizen</div>
              <div className="space" />
              <div className="prewrap">{npc.notes}</div>
            </div>
          ) : null}

          {npc.sources ? (
            <div className="section">
              <div className="h2">Quellen</div>
              <div className="space" />
              <div className="prewrap">{npc.sources}</div>
            </div>
          ) : null}

          {!hasAny(
            npc.description, npc.appearance, npc.personality, npc.biography,
            npc.abilities, npc.equipment, npc.relationships, npc.notes, npc.sources
          ) ? (
            <div className="section">
              <div className="p">Noch keine Artikeltexte eingetragen.</div>
              <div className="space" />
              <Link to={`/app/npcs/${npc.id}/edit`}>
                <button className="btn btnPrimary">Jetzt Daten hinzufügen</button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}