import React from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Boxes, Database, FlaskConical, Settings2 } from "lucide-react";
import { pct, title, empty, useLoad, Notice, PageHead, Stat, RunTable } from "../components/shared";

export function Dashboard() {
  const { data, error, loading, reload } = useLoad([
    "/dashboard/summary",
    "/experiments",
    "/models",
    "/analytics/status-distribution",
    "/analytics/model-performance",
  ]);
  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (error) return <Notice error={error} />;
  const [s, experiments, models, status, performance] = data;
  const latestWithHistory = s.recent_runs.find((r) => r.metric_history?.length);
  const cards = [
    ["Projects", s.total_projects, Boxes],
    ["Datasets", s.total_datasets, Database],
    ["Experiments", s.total_experiments, FlaskConical],
    ["Models", s.total_models, Settings2],
    ["Training Runs", s.total_runs, Activity],
    ["Running", s.running_runs, Activity, "blue"],
    ["Completed", s.completed_runs, Activity, "green"],
    ["Failed", s.failed_runs, Activity, "red"],
  ];
  return (
    <>
      <PageHead
        eyebrow="OVERVIEW"
        heading="Dashboard"
        text="A live view of your experiment workspace."
        action={
          <button className="button secondary" onClick={reload}>
            Refresh data
          </button>
        }
      />
      <div className="stats-grid">
        {cards.map(([label, value, Icon, tone]) => (
          <Stat
            key={label}
            label={label}
            value={value}
            icon={Icon}
            tone={tone}
          />
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel best-panel">
          <div className="eyebrow">BEST PERFORMING RUN</div>
          {s.best_run ? (
            <>
              <h2>
                <Link to={`/runs/${s.best_run.run_id}`}>
                  {s.best_run.run_name}
                </Link>
              </h2>
              <p>
                {s.best_run.model_name} · v{s.best_run.model_version}
              </p>
              <strong className="best-score">
                {pct(s.best_run.metrics?.accuracy)}
              </strong>
              <small>Accuracy</small>
            </>
          ) : (
            empty("No scored runs yet.")
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Run status</h2>
            <span>All runs</span>
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
                    paddingAngle={4}
                  >
                    {status.statuses.map((x, i) => (
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
              empty("No runs yet.")
            )}
          </div>
        </section>
        <section className="panel wide-panel">
          <div className="panel-title">
            <h2>Average model accuracy</h2>
            <span>By model</span>
          </div>
          <div className="chart-box">
            {performance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="model_name" tick={{ fontSize: 12 }} />
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
              empty("No model metrics yet.")
            )}
          </div>
        </section>
        <section className="panel wide-panel">
          <div className="panel-title">
            <h2>Accuracy history</h2>
            <span>{latestWithHistory?.run_name || "Latest run"}</span>
          </div>
          <div className="chart-box">
            {latestWithHistory ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latestWithHistory.metric_history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="epoch" />
                  <YAxis domain={[0, 1]} tickFormatter={pct} />
                  <Tooltip formatter={pct} />
                  <Area
                    dataKey="accuracy"
                    stroke="var(--accent)"
                    fill="var(--accent-soft)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              empty("Metric history will appear here.")
            )}
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-title">
          <h2>Recent training runs</h2>
          <Link to="/runs">View all runs →</Link>
        </div>
        <RunTable
          runs={s.recent_runs}
          experiments={experiments}
          models={models}
          compact
        />
      </section>
    </>
  );
}

