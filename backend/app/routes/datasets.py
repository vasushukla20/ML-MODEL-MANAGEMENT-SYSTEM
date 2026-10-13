from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..schemas import DatasetIn
from ..elasticsearch_client import es
from ..db import now, get, save, listing, reject_if_related, workspace_query

router = APIRouter()


@router.get("/api/datasets")
def datasets(project_id: str | None = None, user=Depends(current_user)):
    return listing("datasets", user, {"project_id": project_id})


@router.post("/api/datasets", status_code=201)
def create_dataset(data: DatasetIn, user=Depends(current_user)):
    get("projects", data.project_id, user)
    doc_id = str(uuid4())
    return save("datasets", doc_id, {**data.model_dump(), "dataset_id": doc_id, "created_at": now()}, user)


@router.get("/api/datasets/{dataset_id}")
def dataset(dataset_id: str, user=Depends(current_user)):
    return get("datasets", dataset_id, user)


@router.put("/api/datasets/{dataset_id}")
def update_dataset(dataset_id: str, data: DatasetIn, user=Depends(current_user)):
    doc = get("datasets", dataset_id, user)
    get("projects", data.project_id, user)
    if es.count(index="experiments", query=workspace_query(user, [{"term": {"dataset_ids": dataset_id}}]))["count"] and doc["project_id"] != data.project_id:
        raise HTTPException(409, "Dataset is used by an experiment in its current project")
    return save("datasets", dataset_id, {**doc, **data.model_dump()}, user)


@router.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: str, user=Depends(current_user)):
    get("datasets", dataset_id, user)
    reject_if_related("experiments", "dataset_ids", dataset_id, user)
    es.delete(index="datasets", id=dataset_id, refresh="wait_for")
    return {"deleted": True}


