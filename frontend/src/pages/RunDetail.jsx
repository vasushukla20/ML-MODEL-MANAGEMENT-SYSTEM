import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AreaChart, Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import api, { message } from "../services/api";
import { pct, date, datetime, badge, title, empty, useLoad, Notice, Modal, ConfirmDelete, Field, input, Select, PageHead, useCrud } from "../components/shared";

export function RunDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLoad(
    [`/runs/${id}`, "/projects", "/experiments", "/models"],
    [id],
  );
  const [action, setAction] = useState(""),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false);
  const act = async (path, values, method = "post") => {
    setBusy(true);
    setActionError("");
    try {
      await api[method](`/runs/${id}/${path}`, values);
      setAction("");
      reload();
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <div className="loading">Loading run…</div>;
  if (error) return <Notice error={error} />;
  const [run, projects, experiments, models] = data;
  const name = (arr, key, id) => arr.find((x) => x[key] === id)?.name || "—";
  return (
    <>
      <Link className="back-link" to="/runs">
        ← Training Runs
      </Link>
      <PageHead
        eyebrow="RUN DETAILS"
        heading={run.run_name}
        text={`${name(projects, "project_id", run.project_id)} · ${name(experiments, "experiment_id", run.experiment_id)}`}
        action={
          <div className="head-actions">
            {badge(run.status)}
            <button
              className="button secondary"
              onClick={() => setEditing(true)}
            >
              Edit run
            </button>
            {run.status === "Running" && (
              <>
                <button
                  className="button primary"
                  onClick={() => act("complete", {}, "patch")}
                >
                  Mark completed
                </button>
                <button
                  className="button danger-outline"
                  onClick={() => act("fail", {}, "patch")}
                >
                  Mark failed
                </button>
              </>
            )}
          </div>
        }
      />
      <Notice error={actionError} />
      <div className="detail-meta">
        <div>
          <small>MODEL</small>
          <strong>
            {run.model_name} v{run.model_version}
          </strong>
        </div>
        <div>
          <small>STARTED</small>
          <strong>{datetime(run.start_time)}</strong>
        </div>
        <div>
          <small>ENDED</small>
          <strong>{datetime(run.end_time)}</strong>
        </div>
        <div>
          <small>STATUS</small>
          <strong>{run.status}</strong>
        </div>
      </div>
      <div className="detail-columns">
        <section className="panel">
          <div className="panel-title">
            <h2>Hyperparameters</h2>
          </div>
          <div className="key-values">
            {Object.entries(run.hyperparameters || {}).map(([k, v]) => (
              <div key={k}>
                <span>{title(k)}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Metrics</h2>
            <button className="text-button" onClick={() => setAction("metric")}>
              + Add metric point
            </button>
          </div>
          <div className="metrics-grid">
            {["accuracy", "precision", "recall", "f1_score", "loss"].map(
              (k) => (
                <div key={k}>
                  <small>{title(k)}</small>
                  <strong>
                    {k === "loss"
                      ? (run.metrics?.[k] ?? "—")
                      : pct(run.metrics?.[k])}
                  </strong>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <h2>Metric history</h2>
          <span>Accuracy and loss by epoch</span>
        </div>
        <div className="chart-box large">
          {run.metric_history?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={run.metric_history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="var(--accent)"
                  fill="var(--accent-soft)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="loss"
                  stroke="var(--amber)"
                  fill="var(--surface-soft)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            empty(
              "No metric history yet. Add a metric point to start the graph.",
            )
          )}
        </div>
      </section>
      <div className="detail-columns">
        <section className="panel">
          <div className="panel-title">
            <h2>Checkpoints</h2>
            <button
              className="text-button"
              onClick={() => setAction("checkpoint")}
            >
              + Add checkpoint
            </button>
          </div>
          {run.checkpoints?.length
            ? run.checkpoints.map((c, i) => (
                <div className="list-row" key={i}>
                  <strong>Epoch {c.epoch}</strong>
                  <span className="break">{c.path}</span>
                </div>
              ))
            : empty("No checkpoints recorded.")}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Evaluation</h2>
            <button
              className="text-button"
              onClick={() => setAction("evaluation")}
            >
              {run.evaluation ? "Edit" : "Add"} evaluation
            </button>
          </div>
          {run.evaluation?.evaluated ? (
            <div className="key-values">
              {Object.entries(run.evaluation)
                .filter(([k]) => k !== "evaluated")
                .map(([k, v]) => (
                  <div key={k}>
                    <span>{title(k)}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
            </div>
          ) : (
            empty("This run has not been evaluated.")
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <h2>Deployment</h2>
          <button
            className="text-button"
            onClick={() => setAction("deployment")}
          >
            {run.deployment ? "Edit" : "Record"} deployment
          </button>
        </div>
        {run.deployment?.deployed ? (
          <div className="key-values">
            <div>
              <span>Environment</span>
              <strong>{run.deployment.environment}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{run.deployment.status}</strong>
            </div>
            <div>
              <span>Deployed</span>
              <strong>{datetime(run.deployment.deployed_at)}</strong>
            </div>
          </div>
        ) : (
          empty("This run is not deployed.")
        )}
      </section>
      {action && (
        <RunActionForm
          type={action}
          run={run}
          onClose={() => {
            setAction("");
            setActionError("");
          }}
          onSubmit={(v) => act(action === "metric" ? "metrics" : action, v)}
          busy={busy}
          error={actionError}
        />
      )}{" "}
      {editing && (
        <RunForm
          value={run}
          projects={projects}
          experiments={experiments}
          models={models}
          onSubmit={async (values) => {
            try {
              await api.put(`/runs/${id}`, values);
              setEditing(false);
              reload();
              return true;
            } catch (e) {
              setActionError(message(e));
              return false;
            }
          }}
          onClose={() => setEditing(false)}
          busy={busy}
          error={actionError}
        />
      )}
    </>
  );
}
export function RunActionForm({ type, run, onClose, onSubmit, busy, error }) {
  const defaults = {
    metric: { epoch: "", accuracy: "", loss: "" },
    checkpoint: { epoch: "", path: "" },
    evaluation: run.evaluation || {
      evaluation_name: "",
      evaluation_type: "",
      result: "Passed",
      notes: "",
      evaluated: true,
    },
    deployment: run.deployment || {
      environment: "Development",
      status: "Active",
      deployed: true,
    },
  };
  const [f, setF] = useState(defaults[type]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    const payload = { ...f };
    if (type === "metric") {
      payload.epoch = Number(payload.epoch);
      for (const k of ["accuracy", "loss"]) {
        if (payload[k] === "") delete payload[k];
        else payload[k] = Number(payload[k]);
      }
    }
    if (type === "checkpoint") payload.epoch = Number(payload.epoch);
    onSubmit(payload);
  };
  return (
    <Modal
      title={
        {
          metric: "Add metric point",
          checkpoint: "Add checkpoint",
          evaluation: "Record evaluation",
          deployment: "Record deployment",
        }[type]
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {type === "metric" && (
          <>
            <Field label="Epoch">
              {input(f.epoch, (v) => set("epoch", v), {
                type: "number",
                min: 1,
                required: true,
              })}
            </Field>
            <div className="form-grid">
              <Field label="Accuracy (0–1)">
                {input(f.accuracy, (v) => set("accuracy", v), {
                  type: "number",
                  min: 0,
                  max: 1,
                  step: "any",
                })}
              </Field>
              <Field label="Loss">
                {input(f.loss, (v) => set("loss", v), {
                  type: "number",
                  min: 0,
                  step: "any",
                })}
              </Field>
            </div>
          </>
        )}
        {type === "checkpoint" && (
          <>
            <Field label="Epoch">
              {input(f.epoch, (v) => set("epoch", v), {
                type: "number",
                min: 1,
                required: true,
              })}
            </Field>
            <Field label="Checkpoint path">
              {input(f.path, (v) => set("path", v), {
                required: true,
                placeholder: "/models/example/epoch10.ckpt",
              })}
            </Field>
          </>
        )}
        {type === "evaluation" && (
          <>
            <Field label="Evaluation name">
              {input(f.evaluation_name, (v) => set("evaluation_name", v), {
                required: true,
              })}
            </Field>
            <Field label="Type">
              {input(f.evaluation_type, (v) => set("evaluation_type", v), {
                required: true,
              })}
            </Field>
            <Field label="Result">
              {input(f.result, (v) => set("result", v), { required: true })}
            </Field>
            <Field label="Notes">
              <textarea
                value={f.notes || ""}
                onChange={(e) => set("notes", e.target.value)}
                rows="3"
              />
            </Field>
          </>
        )}
        {type === "deployment" && (
          <>
            <Field label="Environment">
              <Select
                value={f.environment}
                onChange={(v) => set("environment", v)}
                options={["Development", "Testing", "Production"].map((x) => ({
                  value: x,
                  label: x,
                }))}
              />
            </Field>
            <Field label="Status">
              {input(f.status, (v) => set("status", v), { required: true })}
            </Field>
            <label className="check-inline">
              <input
                type="checkbox"
                checked={f.deployed}
                onChange={(e) => set("deployed", e.target.checked)}
              />{" "}
              Currently deployed
            </label>
          </>
        )}
        <Notice error={error} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}


