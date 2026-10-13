import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, Boxes, Database, FlaskConical } from "lucide-react";
import { date, title, empty, useLoad, Notice, Modal, ConfirmDelete, Field, input, PageHead, Stat, RunTable, useCrud } from "../components/shared";

export function Projects() {
  const c = useCrud("projects", [
    "/datasets",
    "/experiments",
    "/runs",
    "/auth/me",
  ]);
  if (c.loading) return <div className="loading">Loading projects…</div>;
  const [projects, datasets, experiments, runs, user] = c.data;
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE"
        heading="Projects"
        text="Organize datasets and experiments by research goal."
        action={
          <button className="button primary" onClick={() => c.setEditing({})}>
            + New project
          </button>
        }
      />
      <Notice error={c.error} />
      <div className="cards-grid">
        {projects.map((p) => (
          <div className="entity-card" key={p.project_id}>
            <div className="card-icon">
              <Boxes />
            </div>
            <h2>
              <Link to={`/projects/${p.project_id}`}>{p.name}</Link>
            </h2>
            <p>{p.description || "No description"}</p>
            <div className="card-stats">
              <span>
                <strong>
                  {datasets.filter((d) => d.project_id === p.project_id).length}
                </strong>{" "}
                datasets
              </span>
              <span>
                <strong>
                  {
                    experiments.filter((e) => e.project_id === p.project_id)
                      .length
                  }
                </strong>{" "}
                experiments
              </span>
            </div>
            <div className="card-foot">
              <small>
                Created {date(p.created_at)} ·{" "}
                {p.owner_user_id === user.user_id ? user.name : "Team member"}
              </small>
              <div>
                <button className="text-button" onClick={() => c.setEditing(p)}>
                  Edit
                </button>
                <button
                  className="text-button red"
                  onClick={() => c.setDeleting(p)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {!projects.length &&
          empty("No projects yet. Create your first project.")}
      </div>
      {c.editing && (
        <ProjectForm
          value={c.editing}
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
export function ProjectForm({ value, onSubmit, onClose, busy, error }) {
  const [name, setName] = useState(value.name || ""),
    [description, setDescription] = useState(value.description || "");
  return (
    <Modal
      title={value.project_id ? "Edit project" : "New project"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, description });
        }}
      >
        <Field label="Project name">
          {input(name, setName, { required: true })}
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
        </Field>
        <Notice error={error} />
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ProjectDetail() {
  const { id } = useParams();
  const { data, error, loading } = useLoad(
    [
      `/projects/${id}`,
      `/datasets?project_id=${id}`,
      `/experiments?project_id=${id}`,
      `/runs?project_id=${id}`,
    ],
    [id],
  );
  if (loading) return <div className="loading">Loading project…</div>;
  if (error) return <Notice error={error} />;
  const [project, datasets, experiments, runs] = data;
  return (
    <>
      <Link className="back-link" to="/projects">
        ← Projects
      </Link>
      <PageHead
        eyebrow="PROJECT DETAILS"
        heading={project.name}
        text={project.description}
      />
      <div className="stats-grid three">
        <Stat label="Datasets" value={datasets.length} icon={Database} />
        <Stat
          label="Experiments"
          value={experiments.length}
          icon={FlaskConical}
        />
        <Stat label="Training Runs" value={runs.length} icon={Activity} />
      </div>
      <div className="detail-columns">
        <section className="panel">
          <div className="panel-title">
            <h2>Datasets</h2>
            <Link to="/datasets">Manage →</Link>
          </div>
          {datasets.length
            ? datasets.map((d) => (
                <div className="list-row" key={d.dataset_id}>
                  <strong>{d.name}</strong>
                  <span>
                    {d.source} · {d.size.toLocaleString()} items
                  </span>
                </div>
              ))
            : empty("No datasets in this project.")}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Experiments</h2>
            <Link to="/experiments">Manage →</Link>
          </div>
          {experiments.length
            ? experiments.map((e) => (
                <div className="list-row" key={e.experiment_id}>
                  <strong>{e.name}</strong>
                  <span>{e.objective}</span>
                </div>
              ))
            : empty("No experiments in this project.")}
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-title">
          <h2>Related runs</h2>
          <Link to={`/runs?project_id=${id}`}>View all →</Link>
        </div>
        <RunTable runs={runs} experiments={experiments} />
      </section>
    </>
  );
}

