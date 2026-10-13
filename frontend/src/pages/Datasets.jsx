import React, { useState } from "react";
import { Search } from "lucide-react";
import { date, title, empty, Notice, Modal, ConfirmDelete, Field, input, Select, PageHead, useCrud } from "../components/shared";

export function Datasets() {
  const c = useCrud("datasets", ["/projects"]);
  const [search, setSearch] = useState(""),
    [project, setProject] = useState(""),
    [source, setSource] = useState("");
  if (c.loading) return <div className="loading">Loading datasets…</div>;
  const [items, projects] = c.data;
  const view = items.filter(
    (d) =>
      (!project || d.project_id === project) &&
      (!source || d.source === source) &&
      (!search || d.name.toLowerCase().includes(search.toLowerCase())),
  );
  const projectName = (id) =>
    projects.find((p) => p.project_id === id)?.name || "—";
  return (
    <>
      <PageHead
        eyebrow="DATA CATALOG"
        heading="Datasets"
        text="Keep track of the data behind every experiment."
        action={
          <button className="button primary" onClick={() => c.setEditing({})}>
            + Add dataset
          </button>
        }
      />
      <Notice error={c.error} />
      <div className="filters">
        <input
          placeholder="Search datasets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={project}
          onChange={setProject}
          placeholder="All projects"
          required={false}
          options={projects.map((p) => ({
            value: p.project_id,
            label: p.name,
          }))}
        />
        <Select
          value={source}
          onChange={setSource}
          placeholder="All sources"
          required={false}
          options={[
            "Kaggle",
            "HuggingFace",
            "TensorFlow",
            "OpenImages",
            "Custom",
          ].map((x) => ({ value: x, label: x }))}
        />
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Size</th>
                <th>Project</th>
                <th>Type</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.map((d) => (
                <tr key={d.dataset_id}>
                  <td>
                    <strong>{d.name}</strong>
                    <small className="subline">{d.description}</small>
                  </td>
                  <td>{d.source}</td>
                  <td>{d.size.toLocaleString()}</td>
                  <td>{projectName(d.project_id)}</td>
                  <td>{d.data_type}</td>
                  <td>{date(d.created_at)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => c.setEditing(d)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button red"
                      onClick={() => c.setDeleting(d)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!view.length && empty("No datasets match your filters.")}
        </div>
      </div>
      {c.editing && (
        <DatasetForm
          value={c.editing}
          projects={projects}
          onSubmit={c.save}
          onClose={() => c.setEditing(null)}
          busy={c.busy}
          error={c.error}
        />
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
export function DatasetForm({ value, projects, onSubmit, onClose, busy, error }) {
  const [f, setF] = useState({
    project_id: value.project_id || "",
    name: value.name || "",
    description: value.description || "",
    source: value.source || "Custom",
    size: value.size || "",
    data_type: value.data_type || "",
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      title={value.dataset_id ? "Edit dataset" : "Add dataset"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...f, size: Number(f.size) });
        }}
      >
        <Field label="Name">
          {input(f.name, (v) => set("name", v), { required: true })}
        </Field>
        <Field label="Project">
          <Select
            value={f.project_id}
            onChange={(v) => set("project_id", v)}
            options={projects.map((p) => ({
              value: p.project_id,
              label: p.name,
            }))}
          />
        </Field>
        <div className="form-grid">
          <Field label="Source">
            <Select
              value={f.source}
              onChange={(v) => set("source", v)}
              options={[
                "Kaggle",
                "HuggingFace",
                "TensorFlow",
                "OpenImages",
                "Custom",
              ].map((x) => ({ value: x, label: x }))}
            />
          </Field>
          <Field label="Size (items)">
            {input(f.size, (v) => set("size", v), {
              type: "number",
              min: 1,
              required: true,
            })}
          </Field>
        </div>
        <Field label="Data type">
          {input(f.data_type, (v) => set("data_type", v), {
            required: true,
            placeholder: "Images, Text…",
          })}
        </Field>
        <Field label="Description">
          <textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            rows="2"
          />
        </Field>
        <Notice error={error} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            Save dataset
          </button>
        </div>
      </form>
    </Modal>
  );
}

