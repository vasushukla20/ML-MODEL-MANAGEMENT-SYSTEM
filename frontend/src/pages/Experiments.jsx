import React, { useState } from "react";
import { Search } from "lucide-react";
import { date, title, empty, Notice, Modal, ConfirmDelete, Field, input, Select, PageHead, useCrud } from "../components/shared";

export function Experiments() {
  const c = useCrud("experiments", ["/projects", "/datasets", "/runs"]);
  const [project, setProject] = useState(""),
    [search, setSearch] = useState("");
  if (c.loading) return <div className="loading">Loading experiments…</div>;
  const [items, projects, datasets, runs] = c.data;
  const view = items.filter(
    (e) =>
      (!project || e.project_id === project) &&
      (!search || e.name.toLowerCase().includes(search.toLowerCase())),
  );
  const name = (list, key, id) => list.find((x) => x[key] === id)?.name || "—";
  return (
    <>
      <PageHead
        eyebrow="RESEARCH"
        heading="Experiments"
        text="Compare approaches within each project."
        action={
          <button className="button primary" onClick={() => c.setEditing({})}>
            + New experiment
          </button>
        }
      />
      <Notice error={c.error} />
      <div className="filters">
        <input
          placeholder="Search experiments…"
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
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Project</th>
                <th>Datasets</th>
                <th>Objective</th>
                <th>Runs</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.map((e) => (
                <tr key={e.experiment_id}>
                  <td>
                    <strong>{e.name}</strong>
                    <small className="subline">{e.description}</small>
                  </td>
                  <td>{name(projects, "project_id", e.project_id)}</td>
                  <td>
                    {e.dataset_ids
                      .map((id) => name(datasets, "dataset_id", id))
                      .join(", ") || "—"}
                  </td>
                  <td>{e.objective || "—"}</td>
                  <td>
                    {
                      runs.filter((r) => r.experiment_id === e.experiment_id)
                        .length
                    }
                  </td>
                  <td>{date(e.created_at)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => c.setEditing(e)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button red"
                      onClick={() => c.setDeleting(e)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!view.length && empty("No experiments match your filters.")}
        </div>
      </div>
      {c.editing && (
        <ExperimentForm
          value={c.editing}
          projects={projects}
          datasets={datasets}
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
export function ExperimentForm({
  value,
  projects,
  datasets,
  onSubmit,
  onClose,
  busy,
  error,
}) {
  const [f, setF] = useState({
    project_id: value.project_id || "",
    name: value.name || "",
    description: value.description || "",
    objective: value.objective || "",
    dataset_ids: value.dataset_ids || [],
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const available = datasets.filter((d) => d.project_id === f.project_id);
  return (
    <Modal
      title={value.experiment_id ? "Edit experiment" : "New experiment"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(f);
        }}
      >
        <Field label="Experiment name">
          {input(f.name, (v) => set("name", v), { required: true })}
        </Field>
        <Field label="Project">
          <Select
            value={f.project_id}
            onChange={(v) => {
              setF((x) => ({ ...x, project_id: v, dataset_ids: [] }));
            }}
            options={projects.map((p) => ({
              value: p.project_id,
              label: p.name,
            }))}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            rows="2"
          />
        </Field>
        <Field label="Objective">
          {input(f.objective, (v) => set("objective", v))}
        </Field>
        <Field label="Datasets (choose one or more)">
          <div className="check-list">
            {available.length ? (
              available.map((d) => (
                <label key={d.dataset_id}>
                  <input
                    type="checkbox"
                    checked={f.dataset_ids.includes(d.dataset_id)}
                    onChange={(e) =>
                      set(
                        "dataset_ids",
                        e.target.checked
                          ? [...f.dataset_ids, d.dataset_id]
                          : f.dataset_ids.filter((x) => x !== d.dataset_id),
                      )
                    }
                  />
                  {d.name}
                </label>
              ))
            ) : (
              <small>Select a project with datasets.</small>
            )}
          </div>
        </Field>
        <Notice error={error} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            Save experiment
          </button>
        </div>
      </form>
    </Modal>
  );
}

