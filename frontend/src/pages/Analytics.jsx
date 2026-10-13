import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3 } from "lucide-react";
import api, { message } from "../services/api";
import { pct, date, badge, title, empty, useLoad, Notice, Field, input, Select, PageHead, Stat } from "../components/shared";

export function Analytics() {
  const { data: base, loading, error } = useLoad(["/projects", "/models"]);
  const [project, setProject] = useState(""),
    [model, setModel] = useState(""),
    [from, setFrom] = useState(""),
    [data, setData] = useState(null),
    [queryError, setQueryError] = useState("");
  const query = async () => {
    setQueryError("");
    try {
      const params = {
        project_id: project || undefined,
        model_id: model || undefined,
        date_from: from || undefined,
      };
      const results = await Promise.all(
        [
          "/analytics/top-runs",
          "/analytics/model-performance",
          "/analytics/status-distribution",
        ].map((p) => api.get(p, { params }).then((r) => r.data)),
      );
      setData(results);
    } catch (e) {
      setQueryError(message(e));
    }
  };
  useEffect(() => {
    query();
  }, [project, model, from]);
  if (loading) return <div className="loading">Loading analytics…</div>;
  if (error) return <Notice error={error} />;
  const [projects, models] = base;
  const [top, performance, status] = data || [
    [],
    [],
    { statuses: [], deployed: 0, not_deployed: 0 },
  ];
  return (
    <>
      <PageHead
        eyebrow="INSIGHTS"
        heading="Analytics"
        text="Compare performance across models, projects, and time."
      />
      <Notice error={queryError} />
      <div className="filters">
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
          value={model}
          onChange={setModel}
          placeholder="All models"
          required={false}
          options={models.map((m) => ({ value: m.model_id, label: m.name }))}
        />
        <Field label="From date">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
      </div>
      <div className="stats-grid three">
        <Stat
          label="Deployed runs"
          value={status.deployed}
          icon={Activity}
          tone="green"
        />
        <Stat
          label="Not deployed"
          value={status.not_deployed}
          icon={Activity}
        />
        <Stat label="Runs with accuracy" value={top.length} icon={BarChart3} />
      </div>
      <div className="detail-columns">
        <section className="panel">
          <div className="panel-title">
            <h2>Status distribution</h2>
          </div>
          <div className="chart-box">
            {status.statuses.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={status.statuses}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                  >
                    {status.statuses.map((x) => (
                      <Cell
                        key={x.name}
                        fill={
                          {
                            Completed: "var(--green)",
                            Running: "var(--blue)",
                            Failed: "var(--red)",
                          }[x.name] || "var(--muted)"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              empty("No runs match your filters.")
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Average accuracy by model</h2>
          </div>
          <div className="chart-box">
            {performance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="model_name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tickFormatter={pct} />
                  <Tooltip formatter={pct} />
                  <Bar
                    dataKey="average_accuracy"
                    fill="var(--accent)"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              empty("No scored models match your filters.")
            )}
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-title">
          <h2>Top performing runs</h2>
          <span>Sorted by accuracy in Elasticsearch</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Run</th>
                <th>Model</th>
                <th>Status</th>
                <th>Accuracy</th>
                <th>Loss</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={r.run_id}>
                  <td>#{i + 1}</td>
                  <td>
                    <Link className="table-link" to={`/runs/${r.run_id}`}>
                      {r.run_name}
                    </Link>
                  </td>
                  <td>
                    {r.model_name} v{r.model_version}
                  </td>
                  <td>{badge(r.status)}</td>
                  <td className="metric-good">{pct(r.metrics?.accuracy)}</td>
                  <td>{r.metrics?.loss ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!top.length && empty("No scored runs match your filters.")}
        </div>
      </section>
    </>
  );
}

