import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import api, { message } from "../services/api";

export const pct = (value) =>
  value == null ? "—" : `${(Number(value) * 100).toFixed(1)}%`;
export const date = (value) => (value ? new Date(value).toLocaleDateString() : "—");
export const datetime = (value) => (value ? new Date(value).toLocaleString() : "—");
export const badge = (status) => (
  <span className={`badge ${String(status || "").toLowerCase()}`}>
    {status || "—"}
  </span>
);
export const title = (s) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const empty = (text) => <div className="empty">{text}</div>;

export function useLoad(paths, deps = []) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    Promise.all(paths.map((path) => api.get(path).then((r) => r.data)))
      .then(setData)
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
  };
  useEffect(reload, deps);
  return { data, error, loading, reload };
}

export function Notice({ error, success }) {
  return (
    <>
      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}
    </>
  );
}
export function Modal({ title: heading, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{heading}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function ConfirmDelete({ label, onCancel, onConfirm, busy }) {
  return (
    <Modal title="Confirm deletion" onClose={onCancel}>
      <p>
        Delete <strong>{label}</strong>? This cannot be undone.
      </p>
      <div className="form-actions">
        <button className="button secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const input = (value, set, props = {}) => (
  <input value={value ?? ""} onChange={(e) => set(e.target.value)} {...props} />
);
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  required = true,
}) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
export function PageHead({ eyebrow, heading, text, action }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{heading}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
export function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <div className="stat-icon">
        <Icon size={21} />
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
export function RunTable({ runs, experiments = [], models = [], compact = false }) {
  const expName = (id) =>
    experiments.find((x) => x.experiment_id === id)?.name || "—";
  const modelName = (id) => models.find((x) => x.model_id === id)?.name;
  return runs.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Experiment</th>
            <th>Model</th>
            <th>Version</th>
            <th>Accuracy</th>
            {!compact && <th>Loss</th>}
            <th>Status</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.run_id}>
              <td>
                <Link className="table-link" to={`/runs/${r.run_id}`}>
                  {r.run_name}
                </Link>
              </td>
              <td>{expName(r.experiment_id)}</td>
              <td>{modelName(r.model_id) || r.model_name}</td>
              <td>v{r.model_version}</td>
              <td className="metric-good">{pct(r.metrics?.accuracy)}</td>
              {!compact && <td>{r.metrics?.loss ?? "—"}</td>}
              <td>{badge(r.status)}</td>
              <td>{date(r.start_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    empty("No training runs match your selection.")
  );
}

export function useCrud(resource, extra = []) {
  const load = useLoad([`/${resource}`, ...extra]);
  const [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async (values) => {
    setError("");
    setBusy(true);
    try {
      const idKey = resource === "runs" ? "run_id" : `${resource.slice(0, -1)}_id`;
      const id = editing?.[idKey];
      await api[id ? "put" : "post"](
        id ? `/${resource}/${id}` : `/${resource}`,
        values,
      );
      setEditing(null);
      load.reload();
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setError("");
    setBusy(true);
    try {
      await api.delete(
        `/${resource}/${deleting[resource === "runs" ? "run_id" : `${resource.slice(0, -1)}_id`]}`,
      );
      setDeleting(null);
      load.reload();
    } catch (e) {
      setError(message(e));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };
  return {
    ...load,
    editing,
    setEditing,
    deleting,
    setDeleting,
    error: error || load.error,
    busy,
    save,
    remove,
  };
}

