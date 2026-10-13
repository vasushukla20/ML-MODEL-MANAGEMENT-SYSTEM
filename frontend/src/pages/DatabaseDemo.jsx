import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Notice, PageHead, title, useLoad } from "../components/shared";

const relations = [
  "projects.owner_user_id → users.user_id",
  "datasets.project_id → projects.project_id",
  "experiments.project_id → projects.project_id",
  "experiments.dataset_ids → datasets.dataset_id",
  "training_runs.project_id / experiment_id / model_id → related records",
];

export function DatabaseDemo() {
  const [draft, setDraft] = useState("YOLO");
  const [term, setTerm] = useState("YOLO");
  const { data, error, loading, reload } = useLoad(
    [
      "/database/overview",
      `/search?q=${encodeURIComponent(term)}`,
      "/runs?status=Completed&minimum_accuracy=0.9",
      "/analytics/status-distribution",
    ],
    [term],
  );
  const [overview, search, filteredRuns, distribution] = data || [];
  const searchMatches = search
    ? Object.entries(search).flatMap(([index, items]) =>
        items.map((item) => ({ index, name: item.name || item.run_name })),
      )
    : [];

  return (
    <>
      <PageHead
        eyebrow="DBMS PRESENTATION"
        heading="Database Demo"
        text="Live evidence of the Elasticsearch design, stored data, and queries used by this app. Counts and mappings are read from the database for your signed-in workspace."
        action={<button className="button secondary" onClick={reload}>Refresh evidence</button>}
      />
      <Notice error={error} />
      {loading && !data ? <div className="loading">Reading Elasticsearch…</div> : null}
      {overview && (
        <>
          <section className="panel db-demo-flow">
            <div className="panel-title"><h2>How the application connects</h2></div>
            <div className="db-demo-steps"><span>React website</span><b>→</b><span>FastAPI + JWT</span><b>→</b><span>Elasticsearch Cloud</span></div>
            <p>The browser calls FastAPI. Only the backend sends queries to Elasticsearch. Every data query includes a workspace filter so new accounts start empty.</p>
          </section>

          <section className="panel">
            <div className="panel-title"><h2>1. Actual index mappings and sample records</h2><span>6 indices · live from Elasticsearch</span></div>
            <p className="db-demo-note">Elasticsearch stores JSON documents in indices. These mappings define field types. Related documents use IDs, and the backend checks those references.</p>
            <div className="db-demo-grid">
              {overview.indices.map((item) => (
                <article className="db-demo-index" key={item.index}>
                  <div className="db-demo-index-head"><strong>{item.index}</strong><span>{item.count} records</span></div>
                  <div className="db-demo-fields">
                    {item.fields.map((field) => <span key={field.name}><b>{field.name}</b> <em>{field.type}{field.keyword ? " + keyword" : ""}</em></span>)}
                  </div>
                  {item.index === "users" ? <small>Account records are hidden to protect credentials.</small> : (
                    <small>Samples: {item.examples.length ? item.examples.map((x) => x.name).join(" · ") : "None in this workspace yet"}</small>
                  )}
                </article>
              ))}
            </div>
            <div className="db-demo-relations"><strong>Document references</strong>{relations.map((x) => <span key={x}>{x}</span>)}</div>
            <p className="db-demo-note">The demo accounts share seeded records. <Link to="/datasets">Datasets</Link>, <Link to="/projects">Projects</Link>, and <Link to="/runs">Training Runs</Link> show and edit those records. A newly registered account has its own empty workspace.</p>
          </section>

          <section className="panel">
            <div className="panel-title"><h2>2. Live Elasticsearch queries</h2><span>Results change when the data changes</span></div>
            <div className="db-demo-grid db-demo-queries">
              <article className="db-demo-query">
                <h3>Full-text search · multi_match</h3>
                <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setTerm(draft.trim()); }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Search database" />
                  <button className="button primary">Search</button>
                </form>
                <code>{`multi_match: { query: "${term}", fields: ["name^3", "description", "run_name"] }`}</code>
                <strong>{searchMatches.length} matching documents</strong>
                <p>{searchMatches.slice(0, 6).map((x) => `${x.name} (${x.index})`).join(" · ") || "No matches in this workspace."}</p>
              </article>
              <article className="db-demo-query">
                <h3>Exact term + numeric range</h3>
                <code>term: status = Completed<br />range: metrics.accuracy ≥ 0.9</code>
                <strong>{filteredRuns?.length || 0} matching training runs</strong>
                <p>{filteredRuns?.slice(0, 6).map((x) => `${x.run_name} (${(x.metrics.accuracy * 100).toFixed(1)}%)`).join(" · ") || "No matches in this workspace."}</p>
                <Link to="/runs">Open runs and change filters →</Link>
              </article>
              <article className="db-demo-query">
                <h3>Aggregation · terms by status</h3>
                <code>aggs: {'{'} statuses: {'{'} terms: {'{'} field: "status" {'}'} {'}'} {'}'}</code>
                <strong>{distribution?.statuses?.length || 0} status groups</strong>
                <p>{distribution?.statuses?.map((x) => `${x.name}: ${x.value}`).join(" · ") || "No runs in this workspace."}</p>
                <Link to="/analytics">Open analytics charts →</Link>
              </article>
            </div>
            <p className="db-demo-note">All three query types also apply a server-side <code>workspace_id</code> term filter. Create or edit records in the linked pages, then refresh this page to see the result.</p>
          </section>

          <section className="panel db-demo-flow">
            <div className="panel-title"><h2>3. Core operations to demonstrate</h2></div>
            <p><Link to="/projects">Create a project</Link> → <Link to="/datasets">add a dataset</Link> → <Link to="/experiments">create an experiment</Link> → <Link to="/models">add a model</Link> → <Link to="/runs">record a training run</Link>. Edit or delete a record from its page. Refresh this page to show the changed document count and query results.</p>
          </section>
        </>
      )}
    </>
  );
}
