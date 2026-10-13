"""Workspace-scoped Elasticsearch operations used by API routes."""
from datetime import datetime, timezone
from fastapi import HTTPException
from elasticsearch import ApiError
from .elasticsearch_client import es

def now():
    return datetime.now(timezone.utc).isoformat()


def workspace_query(user, clauses=None):
    return {"bool": {"filter": [{"term": {"workspace_id": user["workspace_id"]}}, *(clauses or [])]}}


def get(index, doc_id, user):
    try:
        doc = es.get(index=index, id=doc_id)["_source"]
    except ApiError as exc:
        if exc.status_code == 404:
            raise HTTPException(404, f"{index[:-1].replace('_', ' ').title()} not found")
        raise
    if doc.get("workspace_id") != user["workspace_id"]:
        raise HTTPException(404, f"{index[:-1].replace('_', ' ').title()} not found")
    return doc


def save(index, doc_id, data, user):
    data["workspace_id"] = user["workspace_id"]
    es.index(index=index, id=doc_id, document=data, refresh="wait_for")
    return data


def listing(index, user, filters=None, search=None, sort=None, size=500):
    clauses = [{"term": {key: value}} for key, value in (filters or {}).items() if value is not None]
    if search:
        fields = {"projects": ["name^3", "description"], "datasets": ["name^3", "description"],
                  "experiments": ["name^3", "description", "objective"], "models": ["name^3", "description"],
                  "training_runs": ["run_name^3", "model_name", "status"]}[index]
        clauses.append({"multi_match": {"query": search, "fields": fields, "type": "bool_prefix"}})
    query = workspace_query(user, clauses)
    response = es.search(index=index, query=query, size=size, sort=sort or [{"created_at": "desc"}])
    return [hit["_source"] for hit in response["hits"]["hits"]]


def reject_if_related(index, field, doc_id, user):
    if es.count(index=index, query=workspace_query(user, [{"term": {field: doc_id}}]))["count"]:
        raise HTTPException(409, f"Cannot delete: related {index.replace('_', ' ')} exist")


def check_dataset_project(project_id, dataset_ids, user):
    for dataset_id in dataset_ids:
        if get("datasets", dataset_id, user)["project_id"] != project_id:
            raise HTTPException(400, "All datasets must belong to the selected project")


def validate_run(data, user):
    get("projects", data.project_id, user)
    exp = get("experiments", data.experiment_id, user)
    if exp["project_id"] != data.project_id:
        raise HTTPException(400, "Experiment does not belong to the selected project")
    model = get("models", data.model_id, user)
    if data.model_version not in [v["version"] for v in model["versions"]]:
        raise HTTPException(400, "Selected model version does not exist")
    return model


