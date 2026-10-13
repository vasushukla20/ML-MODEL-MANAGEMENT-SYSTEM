from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..schemas import ModelIn, VersionIn
from ..elasticsearch_client import es
from ..db import now, get, save, listing, reject_if_related

router = APIRouter()


@router.get("/api/models")
def models(model_type: str | None = None, search: str | None = None, user=Depends(current_user)):
    return listing("models", user, {"model_type": model_type}, search)


@router.post("/api/models", status_code=201)
def create_model(data: ModelIn, user=Depends(current_user)):
    doc_id = str(uuid4())
    return save("models", doc_id, {**data.model_dump(exclude_none=True), "model_id": doc_id,
                                   "owner_user_id": user["user_id"], "versions": [], "created_at": now()}, user)


@router.get("/api/models/{model_id}")
def model(model_id: str, user=Depends(current_user)):
    return get("models", model_id, user)


@router.put("/api/models/{model_id}")
def update_model(model_id: str, data: ModelIn, user=Depends(current_user)):
    doc = get("models", model_id, user)
    updated = {**doc, **data.model_dump(exclude_none=True)}
    if doc["name"] != data.name:
        for run in listing("training_runs", user, {"model_id": model_id}):
            run["model_name"] = data.name
            save("training_runs", run["run_id"], run, user)
    return save("models", model_id, updated, user)


@router.delete("/api/models/{model_id}")
def delete_model(model_id: str, user=Depends(current_user)):
    get("models", model_id, user)
    reject_if_related("training_runs", "model_id", model_id, user)
    es.delete(index="models", id=model_id, refresh="wait_for")
    return {"deleted": True}


@router.post("/api/models/{model_id}/versions", status_code=201)
def add_version(model_id: str, data: VersionIn, user=Depends(current_user)):
    doc = get("models", model_id, user)
    if any(v["version"] == data.version for v in doc["versions"]):
        raise HTTPException(409, "Version already exists")
    doc["versions"].append({**data.model_dump(), "created_at": now()})
    return save("models", model_id, doc, user)


