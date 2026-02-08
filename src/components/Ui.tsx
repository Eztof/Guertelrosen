import React from "react";

export function Spinner() {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="p">Lade…</div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error">{message}</div>;
}

export function OkBox({ message }: { message: string }) {
  return <div className="ok">{message}</div>;
}

export function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function formatDateISO(d: string | null | undefined) {
  if (!d) return "";
  return d; // yyyy-mm-dd passt für “Wiki-Style”
}

export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kvRow">
      <div className="kvKey">{label}</div>
      <div className="kvVal">{value}</div>
    </div>
  );
}