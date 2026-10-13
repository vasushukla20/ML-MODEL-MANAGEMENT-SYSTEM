from fastapi import APIRouter, Depends, Query
from ..auth import current_user
from ..elasticsearch_client import es
from ..db import listing, workspace_query

router = APIRouter()


@router.get("/api/search")
def search(q: str = Query(min_length=1), user=Depends(current_user)):
    result = {}
    for index in ("projects", "datasets", "experiments", "models", "training_runs"):
        result[index] = listing(index, user, search=q, size=50)
    return result


def dashboard_data(user):
    counts = {x: es.count(index=x, query=workspace_query(user))["count"] for x in ("projects", "datasets", "experiments", "models", "training_runs")}
    agg = es.search(index="training_runs", size=0, query=workspace_query(user), aggs={"statuses": {"terms": {"field": "status", "size": 10}},
        "average_accuracy": {"avg": {"field": "metrics.accuracy"}},
        "deployed": {"filter": {"term": {"deployment.deployed": True}}}})["aggregations"]
    status = {b["key"]: b["doc_count"] for b in agg["statuses"]["buckets"]}
    top = es.search(index="training_runs", size=1, query=workspace_query(user, [{"exists": {"field": "metrics.accuracy"}}]),
                    sort=[{"metrics.accuracy": "desc"}])["hits"]["hits"]
    return {"total_projects": counts["projects"], "total_datasets": counts["datasets"],
            "total_experiments": counts["experiments"], "total_models": counts["models"],
            "total_runs": counts["training_runs"], "completed_runs": status.get("Completed", 0),
            "running_runs": status.get("Running", 0), "failed_runs": status.get("Failed", 0),
            "deployed_runs": agg["deployed"]["doc_count"], "best_run": top[0]["_source"] if top else None,
            "average_accuracy": agg["average_accuracy"]["value"],
            "recent_runs": listing("training_runs", user, size=8)}


@router.get("/api/dashboard/summary")
def dashboard(user=Depends(current_user)):
    return dashboard_data(user)


@router.get("/api/analytics/top-runs")
def top_runs(model_id: str | None = None, project_id: str | None = None,
             date_from: str | None = None, user=Depends(current_user)):
    clauses = [{"exists": {"field": "metrics.accuracy"}}]
    if model_id: clauses.append({"term": {"model_id": model_id}})
    if project_id: clauses.append({"term": {"project_id": project_id}})
    if date_from: clauses.append({"range": {"created_at": {"gte": date_from}}})
    return [h["_source"] for h in es.search(index="training_runs", size=20,
        query=workspace_query(user, clauses), sort=[{"metrics.accuracy": "desc"}])["hits"]["hits"]]


@router.get("/api/analytics/model-performance")
def model_performance(model_id: str | None = None, project_id: str | None = None,
                      date_from: str | None = None, user=Depends(current_user)):
    clauses = []
    if model_id: clauses.append({"term": {"model_id": model_id}})
    if project_id: clauses.append({"term": {"project_id": project_id}})
    if date_from: clauses.append({"range": {"created_at": {"gte": date_from}}})
    query = workspace_query(user, clauses)
    result = es.search(index="training_runs", size=0, query=query, aggs={"models": {"terms": {"field": "model_id", "size": 100},
        "aggs": {"average_accuracy": {"avg": {"field": "metrics.accuracy"}},
                 "best_accuracy": {"max": {"field": "metrics.accuracy"}}}}})
    names = {m["model_id"]: m["name"] for m in listing("models", user)}
    return [{"model_id": b["key"], "model_name": names.get(b["key"], "Unknown"), "runs": b["doc_count"],
             "average_accuracy": b["average_accuracy"]["value"], "best_accuracy": b["best_accuracy"]["value"]}
            for b in result["aggregations"]["models"]["buckets"]]


@router.get("/api/analytics/status-distribution")
def status_distribution(model_id: str | None = None, project_id: str | None = None,
                        date_from: str | None = None, user=Depends(current_user)):
    clauses = []
    if model_id: clauses.append({"term": {"model_id": model_id}})
    if project_id: clauses.append({"term": {"project_id": project_id}})
    if date_from: clauses.append({"range": {"created_at": {"gte": date_from}}})
    query = workspace_query(user, clauses)
    agg = es.search(index="training_runs", size=0, query=query, aggs={"statuses": {"terms": {"field": "status"}},
        "deployed": {"filter": {"term": {"deployment.deployed": True}}}})["aggregations"]
    return {"statuses": [{"name": b["key"], "value": b["doc_count"]} for b in agg["statuses"]["buckets"]],
            "deployed": agg["deployed"]["doc_count"],
            "not_deployed": sum(b["doc_count"] for b in agg["statuses"]["buckets"]) - agg["deployed"]["doc_count"]}
