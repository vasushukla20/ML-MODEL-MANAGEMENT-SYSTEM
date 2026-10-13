from uuid import uuid4
from fastapi import APIRouter, Depends
from ..auth import current_user
from ..schemas import ProjectIn
from ..elasticsearch_client import es
from ..db import now, get, save, listing, reject_if_related

router = APIRouter()


@router.get("/api/projects")
def projects(user=Depends(current_user)):
    return listing("projects", user)


@router.post("/api/projects", status_code=201)
def create_project(data: ProjectIn, user=Depends(current_user)):
    doc_id = str(uuid4())
    stamp = now()
    return save("projects", doc_id, {**data.model_dump(), "project_id": doc_id, "owner_user_id": user["user_id"], "created_at": stamp, "updated_at": stamp}, user)


@router.get("/api/projects/{project_id}")
def project(project_id: str, user=Depends(current_user)):
    return get("projects", project_id, user)


@router.put("/api/projects/{project_id}")
def update_project(project_id: str, data: ProjectIn, user=Depends(current_user)):
    doc = get("projects", project_id, user)
    return save("projects", project_id, {**doc, **data.model_dump(), "updated_at": now()}, user)


@router.delete("/api/projects/{project_id}")
def delete_project(project_id: str, user=Depends(current_user)):
    get("projects", project_id, user)
    for index in ("datasets", "experiments", "training_runs"):
        reject_if_related(index, "project_id", project_id, user)
    es.delete(index="projects", id=project_id, refresh="wait_for")
    return {"deleted": True}


