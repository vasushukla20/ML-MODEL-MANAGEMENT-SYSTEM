import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AreaChart, Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import api, { message } from "../services/api";
import { pct, date, datetime, badge, title, empty, useLoad, Notice, Modal, ConfirmDelete, Field, input, Select, PageHead, useCrud } from "../components/shared";

export function Runs() {
  const c = useCrud("runs", ["/projects", "/experiments", "/models"]);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [project, setProject] = useState(params.get("project_id") || "");
  const [experiment, setExperiment] = useState(
    params.get("experiment_id") || "",
  );
  const [model, setModel] = useState(params.get("model_id") || "");
  const [minimum, setMinimum] = useState(params.get("minimum_accuracy") || "");
  const [view, setView] = useState([]),
    [queryError, setQueryError] = useState(""),
    [filtering, setFiltering] = useState(false);
  const query = async () => {
    setFiltering(true);
    setQueryError("");
    try {
      const { data } = await api.get("/runs", {
        params: {
          status: status || undefined,
          project_id: project || undefined,
          experiment_id: experiment || undefined,
          model_id: model || undefined,
          minimum_accuracy: minimum === "" ? undefined : Number(minimum),
          search: search || undefined,
        },
      });
      setView(data);
      const p = {};
      if (status) p.status = status;
      if (project) p.project_id = project;
      if (experiment) p.experiment_id = experiment;
      if (model) p.model_id = model;
      if (minimum) p.minimum_accuracy = minimum;
      if (search) p.search = search;
      setParams(p);
    } catch (e) {
      setQueryError(message(e));
    } finally {
      setFiltering(false);
    }
  };
  useEffect(() => {
    query();
  }, [c.data]);
  if (c.loading) return <div className="loading">Loading training runs…</div>;
  const [items, projects, experiments, models] = c.data;
  return (
    <>
      <PageHead
        eyebrow="EXPERIMENT LOG"
        heading="Training Runs"
        text="Track training progress, metrics, and model outcomes."
        action={
          <button className="button primary" onClick={() => c.setEditing({})}>
            + New run
          </button>
        }
      />
      <Notice error={c.error || queryError} />
      <form
        className="filters run-filters"
        onSubmit={(e) => {
          e.preventDefault();
          query();
        }}
      >
        <input
          placeholder="Search run or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          required={false}
          options={["Running", "Completed", "Failed"].map((x) => ({
            value: x,
            label: x,
          }))}
        />
        <Select
          value={project}
          onChange={(v) => {
            setProject(v);
            setExperiment("");
          }}
          placeholder="All projects"
          required={false}
          options={projects.map((p) => ({
            value: p.project_id,
            label: p.name,
          }))}
        />
        <Select
          value={experiment}
          onChange={setExperiment}
          placeholder="All experiments"
          required={false}
          options={experiments
            .filter((e) => !project || e.project_id === project)
            .map((e) => ({ value: e.experiment_id, label: e.name }))}
        />
        <Select
          value={model}
          onChange={setModel}
          placeholder="All models"
          required={false}
          options={models.map((m) => ({ value: m.model_id, label: m.name }))}
        />
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          placeholder="Min accuracy (0–1)"
          value={minimum}
          onChange={(e) => setMinimum(e.target.value)}
        />
        <button className="button secondary" disabled={filtering}>
          {filtering ? "Filtering…" : "Apply filters"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setSearch("");
            setStatus("");
            setProject("");
            setExperiment("");
            setModel("");
            setMinimum("");
            setParams({});
            setView(items);
          }}
        >
          Clear
        </button>
      </form>
      <section className="panel table-panel">
        <div className="panel-title">
          <h2>
            Runs <span className="count">{view.length}</span>
          </h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Experiment</th>
                <th>Model</th>
                <th>Version</th>
                <th>Status</th>
                <th>Accuracy</th>
                <th>Loss</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.run_id}>
                  <td>
                    <Link className="table-link" to={`/runs/${r.run_id}`}>
                      {r.run_name}
                    </Link>
                  </td>
                  <td>
                    {experiments.find(
                      (e) => e.experiment_id === r.experiment_id,
                    )?.name || "—"}
                  </td>
                  <td>{r.model_name}</td>
                  <td>v{r.model_version}</td>
                  <td>{badge(r.status)}</td>
                  <td className="metric-good">{pct(r.metrics?.accuracy)}</td>
                  <td>{r.metrics?.loss ?? "—"}</td>
                  <td>{date(r.start_time)}</td>
                  <td>{date(r.end_time)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => c.setEditing(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button red"
                      onClick={() => c.setDeleting(r)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!view.length && empty("No runs match the current filters.")}
        </div>
      </section>
      {c.editing && (
        <RunForm
          value={c.editing}
          projects={projects}
          experiments={experiments}
          models={models}
          onSubmit={c.save}
          onClose={() => c.setEditing(null)}
          busy={c.busy}
          error={c.error}
        />
      )}{" "}
      {c.deleting && (
        <ConfirmDelete
          label={c.deleting.run_name}
          onCancel={() => c.setDeleting(null)}
          onConfirm={c.remove}
          busy={c.busy}
        />
      )}
    </>
  );
}

export function RunForm({
  value,
  projects,
  experiments,
  models,
  onSubmit,
  onClose,
  busy,
  error,
}) {
  const [f, setF] = useState({
    run_name: value.run_name || "",
    project_id: value.project_id || "",
    experiment_id: value.experiment_id || "",
    model_id: value.model_id || "",
    model_version: value.model_version || "",
    status: value.status || "Running",
    hyperparameters: value.hyperparameters || {
      learning_rate: 0.001,
      batch_size: 32,
      epochs: 30,
    },
    metrics: value.metrics || {},
  });
  const [extra, setExtra] = useState(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value.hyperparameters || {}).filter(
          ([key]) => !["learning_rate", "batch_size", "epochs"].includes(key),
        ),
      ),
      null,
      2,
    ),
  );
  const [formError, setFormError] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setNested = (group, k, v) =>
    setF((x) => ({ ...x, [group]: { ...x[group], [k]: v } }));
  const selectedModel = models.find((m) => m.model_id === f.model_id);
  const submit = (e) => {
    e.preventDefault();
    let additional;
    try {
      additional = JSON.parse(extra || "{}");
      if (
        additional === null ||
        Array.isArray(additional) ||
        typeof additional !== "object"
      ) {
        throw new Error("Additional parameters must be a JSON object.");
      }
    } catch (error) {
      setFormError(
        error.message || "Enter valid JSON for additional parameters.",
      );
      return;
    }
    setFormError("");
    const hyperparameters = {
      ...additional,
      learning_rate: Number(f.hyperparameters.learning_rate),
      batch_size: Number(f.hyperparameters.batch_size),
      epochs: Number(f.hyperparameters.epochs),
    };
    const metrics = {};
    for (const [k, v] of Object.entries(f.metrics)) {
      if (v !== "" && v != null) metrics[k] = Number(v);
    }
    onSubmit({ ...f, hyperparameters, metrics });
  };
  return (
    <Modal
      title={value.run_id ? "Edit training run" : "New training run"}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <Field label="Run name">
          {input(f.run_name, (v) => set("run_name", v), { required: true })}
        </Field>
        <div className="form-grid">
          <Field label="Project">
            <Select
              value={f.project_id}
              onChange={(v) =>
                setF((x) => ({ ...x, project_id: v, experiment_id: "" }))
              }
              options={projects.map((p) => ({
                value: p.project_id,
                label: p.name,
              }))}
            />
          </Field>
          <Field label="Experiment">
            <Select
              value={f.experiment_id}
              onChange={(v) => set("experiment_id", v)}
              options={experiments
                .filter((x) => x.project_id === f.project_id)
                .map((x) => ({ value: x.experiment_id, label: x.name }))}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Model">
            <Select
              value={f.model_id}
              onChange={(v) =>
                setF((x) => ({ ...x, model_id: v, model_version: "" }))
              }
              options={models.map((m) => ({
                value: m.model_id,
                label: m.name,
              }))}
            />
          </Field>
          <Field label="Version">
            <Select
              value={f.model_version}
              onChange={(v) => set("model_version", v)}
              options={(selectedModel?.versions || []).map((v) => ({
                value: v.version,
                label: `v${v.version}`,
              }))}
            />
          </Field>
        </div>
        <Field label="Status">
          <Select
            value={f.status}
            onChange={(v) => set("status", v)}
            options={["Running", "Completed", "Failed"].map((x) => ({
              value: x,
              label: x,
            }))}
          />
        </Field>
        <h3 className="form-section">Hyperparameters</h3>
        <div className="form-grid three">
          <Field label="Learning rate">
            {input(
              f.hyperparameters.learning_rate,
              (v) => setNested("hyperparameters", "learning_rate", v),
              { type: "number", step: "any", min: "0.0000001", required: true },
            )}
          </Field>
          <Field label="Batch size">
            {input(
              f.hyperparameters.batch_size,
              (v) => setNested("hyperparameters", "batch_size", v),
              { type: "number", min: 1, required: true },
            )}
          </Field>
          <Field label="Epochs">
            {input(
              f.hyperparameters.epochs,
              (v) => setNested("hyperparameters", "epochs", v),
              { type: "number", min: 1, required: true },
            )}
          </Field>
        </div>
        <Field label="Additional hyperparameters (JSON object)">
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows="3"
            placeholder='{"optimizer":"Adam"}'
          />
        </Field>
        <h3 className="form-section">
          Metrics <small>(optional at creation)</small>
        </h3>
        <div className="form-grid three">
          {["accuracy", "precision", "recall", "f1_score", "loss"].map((k) => (
            <Field key={k} label={title(k)}>
              {input(f.metrics[k] ?? "", (v) => setNested("metrics", k, v), {
                type: "number",
                step: "any",
                min: 0,
                max: k === "loss" ? undefined : 1,
              })}
            </Field>
          ))}
        </div>
        <Notice error={formError || error} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save run"}
          </button>
        </div>
      </form>
    </Modal>
  );
}


