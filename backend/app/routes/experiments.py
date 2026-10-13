from uuid import uuid4
from fastapi import APIRouter, Depends
from ..auth import current_user
from ..schemas import ExperimentIn
from ..elasticsearch_client import es
from ..db import now, get, save, listing, reject_if_related, check_dataset_project

router = APIRouter()


@router.get("/api/experiments")
def experiments(project_id: str | None = None, user=Depends(current_user)):
    return listing("experiments", user, {"project_id": project_id})


@router.post("/api/experiments", status_code=201)
def create_experiment(data: ExperimentIn, user=Depends(current_user)):
    get("projects", data.project_id, user)
    check_dataset_project(data.project_id, data.dataset_ids, user)
    doc_id = str(uuid4())
    return save("experiments", doc_id, {**data.model_dump(), "experiment_id": doc_id, "created_at": now()}, user)


@router.get("/api/experiments/{experiment_id}")
def experiment(experiment_id: str, user=Depends(current_user)):
    return get("experiments", experiment_id, user)


@router.put("/api/experiments/{experiment_id}")
def update_experiment(experiment_id: str, data: ExperimentIn, user=Depends(current_user)):
    doc = get("experiments", experiment_id, user)
    get("projects", data.project_id, user)
    check_dataset_project(data.project_id, data.dataset_ids, user)
    if doc["project_id"] != data.project_id:
        reject_if_related("training_runs", "experiment_id", experiment_id, user)
    return save("experiments", experiment_id, {**doc, **data.model_dump()}, user)


@router.delete("/api/experiments/{experiment_id}")
def delete_experiment(experiment_id: str, user=Depends(current_user)):
    get("experiments", experiment_id, user)
    reject_if_related("training_runs", "experiment_id", experiment_id, user)
    es.delete(index="experiments", id=experiment_id, refresh="wait_for")
    return {"deleted": True}


