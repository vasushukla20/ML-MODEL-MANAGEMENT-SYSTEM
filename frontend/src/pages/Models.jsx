import React, { useState } from "react";
import { Search, Settings2 } from "lucide-react";
import api, { message } from "../services/api";
import { date, badge, title, empty, Notice, Modal, ConfirmDelete, Field, input, Select, PageHead, useCrud } from "../components/shared";

export function Models() {
  const c = useCrud("models");
  const [type, setType] = useState(""),
    [search, setSearch] = useState(""),
    [versionModel, setVersionModel] = useState(null),
    [viewModel, setViewModel] = useState(null);
  if (c.loading) return <div className="loading">Loading models…</div>;
  const [items] = c.data;
  const view = items.filter(
    (m) =>
      (!type || m.model_type === type) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase())),
  );
  const addVersion = async (values) => {
    try {
      await api.post(`/models/${versionModel.model_id}/versions`, values);
      setVersionModel(null);
      c.reload();
    } catch (e) {
      c.setEditing(null);
      alert(message(e));
    }
  };
  return (
    <>
      <PageHead
        eyebrow="MODEL REGISTRY"
        heading="Models"
        text="Manage model definitions and their versions."
        action={
          <button className="button primary" onClick={() => c.setEditing({})}>
            + Register model
          </button>
        }
      />
      <Notice error={c.error} />
      <div className="filters">
        <input
          placeholder="Search models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={type}
          onChange={setType}
          placeholder="All types"
          required={false}
          options={["VISION", "LLM"].map((x) => ({ value: x, label: x }))}
        />
      </div>
      <div className="cards-grid">
        {view.map((m) => (
          <div className="entity-card" key={m.model_id}>
            <div className="card-top">
              <div className="card-icon">
                <Settings2 />
              </div>
              {badge(m.model_type)}
            </div>
            <h2>{m.name}</h2>
            <p>{m.description}</p>
            <div className="model-details">
              {m.model_type === "VISION" ? (
                <>
                  <span>Input: {m.details?.input_size || "—"}</span>
                  <span>Backbone: {m.details?.backbone || "—"}</span>
                  <span>Layers: {m.details?.num_layers || "—"}</span>
                </>
              ) : (
                <>
                  <span>Context: {m.details?.context_length || "—"}</span>
                  <span>Architecture: {m.details?.architecture || "—"}</span>
                  <span>
                    Parameters:{" "}
                    {m.details?.num_parameters?.toLocaleString() || "—"}
                  </span>
                </>
              )}
            </div>
            <div className="card-foot">
              <small>
                Latest v{m.versions?.at(-1)?.version || "—"} ·{" "}
                {m.versions?.length || 0} versions
              </small>
              <div>
                <button className="text-button" onClick={() => setViewModel(m)}>
                  Versions
                </button>
                <button
                  className="text-button"
                  onClick={() => setVersionModel(m)}
                >
                  + Version
                </button>
                <button className="text-button" onClick={() => c.setEditing(m)}>
                  Edit
                </button>
                <button
                  className="text-button red"
                  onClick={() => c.setDeleting(m)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {!view.length && empty("No models match your filters.")}
      </div>
      {c.editing && (
        <ModelForm
          value={c.editing}
          onSubmit={c.save}
          onClose={() => c.setEditing(null)}
          busy={c.busy}
          error={c.error}
        />
      )}{" "}
      {versionModel && (
        <VersionForm
          onSubmit={addVersion}
          onClose={() => setVersionModel(null)}
        />
      )}{" "}
      {viewModel && (
        <Modal
          title={`${viewModel.name} versions`}
          onClose={() => setViewModel(null)}
        >
          {viewModel.versions?.length
            ? viewModel.versions.map((v) => (
                <div className="list-row" key={v.version}>
                  <strong>v{v.version}</strong>
                  <span>
                    {v.description} · {date(v.created_at)}
                  </span>
                </div>
              ))
            : empty("No versions yet.")}
        </Modal>
      )}{" "}
      {c.deleting && (
        <ConfirmDelete
          label={c.deleting.name}
          onCancel={() => c.setDeleting(null)}
          onConfirm={c.remove}
          busy={c.busy}
        />
      )}
    </>
  );
}
export function ModelForm({ value, onSubmit, onClose, busy, error }) {
  const [f, setF] = useState({
    name: value.name || "",
    description: value.description || "",
    model_type: value.model_type || "VISION",
    details: value.details || {},
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setDetail = (k, v) =>
    setF((x) => ({ ...x, details: { ...x.details, [k]: v } }));
  const number = (k, label) => (
    <Field label={label}>
      {input(f.details[k] ?? "", (v) => setDetail(k, v), {
        type: "number",
        min: 1,
      })}
    </Field>
  );
  return (
    <Modal
      title={value.model_id ? "Edit model" : "Register model"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const details = { ...f.details };
          ["num_layers", "context_length", "num_parameters"].forEach((k) => {
            if (details[k] !== undefined && details[k] !== "")
              details[k] = Number(details[k]);
            else delete details[k];
          });
          onSubmit({ ...f, details });
        }}
      >
        <Field label="Model name">
          {input(f.name, (v) => set("name", v), { required: true })}
        </Field>
        <Field label="Type">
          <Select
            value={f.model_type}
            onChange={(v) => set("model_type", v)}
            options={["VISION", "LLM"].map((x) => ({ value: x, label: x }))}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            rows="2"
          />
        </Field>
        {f.model_type === "VISION" ? (
          <>
            <Field label="Input size">
              {input(
                f.details.input_size || "",
                (v) => setDetail("input_size", v),
                { placeholder: "640x640" },
              )}
            </Field>
            <Field label="Backbone">
              {input(f.details.backbone || "", (v) => setDetail("backbone", v))}
            </Field>
            {number("num_layers", "Number of layers")}
          </>
        ) : (
          <>
            <Field label="Architecture">
              {input(f.details.architecture || "", (v) =>
                setDetail("architecture", v),
              )}
            </Field>
            {number("context_length", "Context length")}
            {number("num_parameters", "Number of parameters")}
          </>
        )}
        <Notice error={error} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            Save model
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function VersionForm({ onSubmit, onClose }) {
  const [version, setVersion] = useState(""),
    [description, setDescription] = useState("");
  return (
    <Modal title="Add model version" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ version, description });
        }}
      >
        <Field label="Version">
          {input(version, setVersion, { required: true, placeholder: "1.2" })}
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="2"
          />
        </Field>
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">Add version</button>
        </div>
      </form>
    </Modal>
  );
}

