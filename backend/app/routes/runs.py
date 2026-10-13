from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from ..auth import current_user
from ..schemas import RunIn, MetricEntry, CheckpointIn, EvaluationIn, DeploymentIn
from ..elasticsearch_client import es
from ..db import now, get, save, validate_run, workspace_query

router = APIRouter()


@router.get("/api/runs")
def runs(status: str | None = None, project_id: str | None = None, experiment_id: str | None = None,
         model_id: str | None = None, minimum_accuracy: float | None = Query(default=None, ge=0, le=1),
         search: str | None = None, user=Depends(current_user)):
    filters = {"status": status, "project_id": project_id, "experiment_id": experiment_id, "model_id": model_id}
    clauses = [{"term": {k: v}} for k, v in filters.items() if v]
    if minimum_accuracy is not None:
        clauses.append({"range": {"metrics.accuracy": {"gte": minimum_accuracy}}})
    if search:
        clauses.append({"multi_match": {"query": search, "fields": ["run_name^3", "model_name", "status"], "type": "bool_prefix"}})
    query = workspace_query(user, clauses)
    return [h["_source"] for h in es.search(index="training_runs", query=query, size=500,
                                             sort=[{"created_at": "desc"}])["hits"]["hits"]]


@router.post("/api/runs", status_code=201)
def create_run(data: RunIn, user=Depends(current_user)):
    model = validate_run(data, user)
    doc_id = str(uuid4())
    stamp = now()
    return save("training_runs", doc_id, {**data.model_dump(), "run_id": doc_id, "model_name": model["name"],
             "start_time": stamp, "end_time": stamp if data.status != "Running" else None,
             "metric_history": [], "checkpoints": [], "evaluation": None, "deployment": None, "created_at": stamp}, user)


@router.get("/api/runs/{run_id}")
def run(run_id: str, user=Depends(current_user)):
    return get("training_runs", run_id, user)


@router.put("/api/runs/{run_id}")
def update_run(run_id: str, data: RunIn, user=Depends(current_user)):
    doc = get("training_runs", run_id, user)
    model = validate_run(data, user)
    end = doc.get("end_time") if data.status == doc["status"] else (None if data.status == "Running" else now())
    return save("training_runs", run_id, {**doc, **data.model_dump(), "model_name": model["name"], "end_time": end}, user)


@router.delete("/api/runs/{run_id}")
def delete_run(run_id: str, user=Depends(current_user)):
    get("training_runs", run_id, user)
    es.delete(index="training_runs", id=run_id, refresh="wait_for")
    return {"deleted": True}


def change_status(run_id, status, user):
    doc = get("training_runs", run_id, user)
    doc["status"] = status
    doc["end_time"] = now()
    return save("training_runs", run_id, doc, user)


@router.patch("/api/runs/{run_id}/complete")
def complete_run(run_id: str, user=Depends(current_user)):
    return change_status(run_id, "Completed", user)


@router.patch("/api/runs/{run_id}/fail")
def fail_run(run_id: str, user=Depends(current_user)):
    return change_status(run_id, "Failed", user)


@router.post("/api/runs/{run_id}/metrics")
def add_metrics(run_id: str, data: MetricEntry, user=Depends(current_user)):
    doc = get("training_runs", run_id, user)
    doc["metric_history"].append({**data.model_dump(exclude_none=True), "timestamp": now()})
    doc["metric_history"].sort(key=lambda x: x["epoch"])
    doc["metrics"].update(data.model_dump(exclude={"epoch"}, exclude_none=True))
    return save("training_runs", run_id, doc, user)


@router.post("/api/runs/{run_id}/checkpoint")
def add_checkpoint(run_id: str, data: CheckpointIn, user=Depends(current_user)):
    doc = get("training_runs", run_id, user)
    doc["checkpoints"].append({**data.model_dump(), "created_at": now()})
    return save("training_runs", run_id, doc, user)


@router.post("/api/runs/{run_id}/evaluation")
def add_evaluation(run_id: str, data: EvaluationIn, user=Depends(current_user)):
    doc = get("training_runs", run_id, user)
    doc["evaluation"] = data.model_dump()
    return save("training_runs", run_id, doc, user)


@router.post("/api/runs/{run_id}/deployment")
def add_deployment(run_id: str, data: DeploymentIn, user=Depends(current_user)):
    doc = get("training_runs", run_id, user)
    if doc["status"] != "Completed":
        raise HTTPException(400, "Only completed runs can be deployed")
    doc["deployment"] = {**data.model_dump(), "deployed_at": now() if data.deployed else None}
    return save("training_runs", run_id, doc, user)


