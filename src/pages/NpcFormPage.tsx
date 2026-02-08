import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSupabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import type { Npc } from "../types/npc";
import { ErrorBox, Spinner } from "../components/Ui";

type Mode = "create" | "edit";

type Props = { mode: Mode };

type FormState = {
  name: string;
  aka: string;
  species: string;
  culture: string;
  profession: string;
  titles: string;

  birth_date: string;
  death_date: string;
  birthplace: string;
  residence: string;

  affiliations: string;

  description: string;
  appearance: string;
  personality: string;
  biography: string;

  abilities: string;
  equipment: string;
  relationships: string;

  notes: string;
  sources: string;

  tags: string; // comma-separated input
};

const emptyForm: FormState = {
  name: "",
  aka: "",
  species: "",
  culture: "",
  profession: "",
  titles: "",

  birth_date: "",
  death_date: "",
  birthplace: "",
  residence: "",

  affiliations: "",

  description: "",
  appearance: "",
  personality: "",
  biography: "",

  abilities: "",
  equipment: "",
  relationships: "",

  notes: "",
  sources: "",

  tags: ""
};

function toNullIfEmpty(v: string) {
  const t = v.trim();
  return t.length ? t : null;
}

function parseTags(raw: string): string[] | null {
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

export function NpcFormPage({ mode }: Props) {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useSession();

  const isEdit = mode === "edit";
  const pageTitle = isEdit ? "NSC bearbeiten" : "Neuer NSC";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = useMemo(() => isEdit && !!id, [isEdit, id]);

  async function load() {
    if (!canLoad) return;

    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb.from("npcs").select("*").eq("id", id!).single();
      if (error) throw error;
      const n = data as Npc;

      setForm({
        name: n.name ?? "",
        aka: n.aka ?? "",
        species: n.species ?? "",
        culture: n.culture ?? "",
        profession: n.profession ?? "",
        titles: n.titles ?? "",

        birth_date: n.birth_date ?? "",
        death_date: n.death_date ?? "",
        birthplace: n.birthplace ?? "",
        residence: n.residence ?? "",

        affiliations: n.affiliations ?? "",

        description: n.description ?? "",
        appearance: n.appearance ?? "",
        personality: n.personality ?? "",
        biography: n.biography ?? "",

        abilities: n.abilities ?? "",
        equipment: n.equipment ?? "",
        relationships: n.relationships ?? "",

        notes: n.notes ?? "",
        sources: n.sources ?? "",

        tags: (n.tags ?? []).join(", ")
      });
    } catch (e: any) {
      setError(e?.message ?? "Konnte NSC nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }

    setSaving(true);
    try {
      const sb = getSupabase();

      const payload = {
        name: form.name.trim(),

        aka: toNullIfEmpty(form.aka),
        species: toNullIfEmpty(form.species),
        culture: toNullIfEmpty(form.culture),
        profession: toNullIfEmpty(form.profession),
        titles: toNullIfEmpty(form.titles),

        birth_date: toNullIfEmpty(form.birth_date),
        death_date: toNullIfEmpty(form.death_date),
        birthplace: toNullIfEmpty(form.birthplace),
        residence: toNullIfEmpty(form.residence),

        affiliations: toNullIfEmpty(form.affiliations),

        description: toNullIfEmpty(form.description),
        appearance: toNullIfEmpty(form.appearance),
        personality: toNullIfEmpty(form.personality),
        biography: toNullIfEmpty(form.biography),

        abilities: toNullIfEmpty(form.abilities),
        equipment: toNullIfEmpty(form.equipment),
        relationships: toNullIfEmpty(form.relationships),

        notes: toNullIfEmpty(form.notes),
        sources: toNullIfEmpty(form.sources),

        tags: parseTags(form.tags)
      };

      if (isEdit) {
        const { error } = await sb.from("npcs").update(payload).eq("id", id!);
        if (error) throw error;
        nav(`/app/npcs/${id}`);
      } else {
        const created_by = session?.user?.id;
        if (!created_by) throw new Error("Keine Session (bitte neu einloggen).");

        const { data, error } = await sb
          .from("npcs")
          .insert({ ...payload, created_by })
          .select("id")
          .single();

        if (error) throw error;
        nav(`/app/npcs/${(data as any).id}`);
      }
    } catch (e: any) {
      setError(e?.message ?? "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (loading) return <Spinner />;

  return (
    <div className="card">
      <div className="section">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="col" style={{ gap: 6 }}>
            <div className="h1">{pageTitle}</div>
            <div className="p">Wiki-artig: Leere Felder werden später in der Ansicht nicht angezeigt.</div>
          </div>
          <div className="row">
            <Link to="/app/npcs"><button className="btn">Abbrechen</button></Link>
          </div>
        </div>

        <div className="space" />

        {error ? <ErrorBox message={error} /> : null}
        {error ? <div className="space" /> : null}

        <form onSubmit={onSubmit} className="col">
          <div className="card" style={{ padding: 14, borderRadius: 12, background: "rgba(16,19,27,.65)" }}>
            <div className="h2">Basisdaten</div>
            <div className="space" />

            <div>
              <div className="label">Name *</div>
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="label">Auch bekannt als</div>
                <input className="input" value={form.aka} onChange={(e) => set("aka", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">Titel / Beiname</div>
                <input className="input" value={form.titles} onChange={(e) => set("titles", e.target.value)} />
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="label">Spezies</div>
                <input className="input" value={form.species} onChange={(e) => set("species", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">Kultur</div>
                <input className="input" value={form.culture} onChange={(e) => set("culture", e.target.value)} />
              </div>
            </div>

            <div>
              <div className="label">Profession</div>
              <input className="input" value={form.profession} onChange={(e) => set("profession", e.target.value)} />
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="label">Geburtsdatum (YYYY-MM-DD)</div>
                <input className="input" type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">Sterbedatum (YYYY-MM-DD)</div>
                <input className="input" type="date" value={form.death_date} onChange={(e) => set("death_date", e.target.value)} />
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="label">Herkunft / Geburtsort</div>
                <input className="input" value={form.birthplace} onChange={(e) => set("birthplace", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">Wohnort</div>
                <input className="input" value={form.residence} onChange={(e) => set("residence", e.target.value)} />
              </div>
            </div>

            <div>
              <div className="label">Zugehörigkeiten (Orden, Gruppe, Kirche, …)</div>
              <input className="input" value={form.affiliations} onChange={(e) => set("affiliations", e.target.value)} />
            </div>

            <div>
              <div className="label">Tags (Komma-getrennt)</div>
              <input className="input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="z.B. borbaradianer, antagonist, gareth" />
            </div>
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 12, background: "rgba(16,19,27,.65)" }}>
            <div className="h2">Artikel-Texte</div>
            <div className="space" />

            <div>
              <div className="label">Kurzbeschreibung</div>
              <textarea className="textarea" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div>
              <div className="label">Erscheinung</div>
              <textarea className="textarea" value={form.appearance} onChange={(e) => set("appearance", e.target.value)} />
            </div>

            <div>
              <div className="label">Charakter & Auftreten</div>
              <textarea className="textarea" value={form.personality} onChange={(e) => set("personality", e.target.value)} />
            </div>

            <div>
              <div className="label">Biographie</div>
              <textarea className="textarea" value={form.biography} onChange={(e) => set("biography", e.target.value)} />
            </div>

            <div>
              <div className="label">Fähigkeiten</div>
              <textarea className="textarea" value={form.abilities} onChange={(e) => set("abilities", e.target.value)} />
            </div>

            <div>
              <div className="label">Ausrüstung</div>
              <textarea className="textarea" value={form.equipment} onChange={(e) => set("equipment", e.target.value)} />
            </div>

            <div>
              <div className="label">Beziehungen</div>
              <textarea className="textarea" value={form.relationships} onChange={(e) => set("relationships", e.target.value)} />
            </div>

            <div>
              <div className="label">Notizen</div>
              <textarea className="textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>

            <div>
              <div className="label">Quellen</div>
              <textarea className="textarea" value={form.sources} onChange={(e) => set("sources", e.target.value)} placeholder="z.B. Abenteuer, Buch, Sitzungsnotizen…" />
            </div>
          </div>

          <button className="btn btnPrimary" disabled={saving}>
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}