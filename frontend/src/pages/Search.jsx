import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { title, empty, useLoad, Notice, PageHead } from "../components/shared";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { data, error, loading } = useLoad(
    [`/search?q=${encodeURIComponent(q)}`],
    [q],
  );
  const results = data?.[0] || {};
  const groups = [
    ["projects", "project_id", "Projects", "/projects/"],
    ["datasets", "dataset_id", "Datasets", "/datasets"],
    ["experiments", "experiment_id", "Experiments", "/experiments"],
    ["models", "model_id", "Models", "/models"],
    ["training_runs", "run_id", "Training Runs", "/runs/"],
  ];
  return (
    <>
      <PageHead
        eyebrow="ELASTICSEARCH"
        heading={`Search results for “${q}”`}
        text="Results come from full-text queries across the six-index datastore."
      />
      {loading ? (
        <div className="loading">Searching…</div>
      ) : error ? (
        <Notice error={error} />
      ) : (
        <div className="search-results">
          {groups.map(([key, id, label, path]) => (
            <section className="panel" key={key}>
              <div className="panel-title">
                <h2>
                  {label}{" "}
                  <span className="count">{results[key]?.length || 0}</span>
                </h2>
              </div>
              {results[key]?.length
                ? results[key].map((item) => (
                    <div className="list-row" key={item[id]}>
                      <Link
                        className="table-link"
                        to={path.endsWith("/") ? path + item[id] : path}
                      >
                        {item.name || item.run_name}
                      </Link>
                      <span>{item.description || item.model_name || ""}</span>
                    </div>
                  ))
                : empty(`No ${label.toLowerCase()} found.`)}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

