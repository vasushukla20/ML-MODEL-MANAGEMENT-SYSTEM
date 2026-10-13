from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from ..auth import passwords, make_token, current_user
from ..schemas import Register, Login
from ..elasticsearch_client import es
from ..db import now, save

router = APIRouter()


@router.post("/api/auth/register", status_code=201)
def register(data: Register):
    email = data.email.lower()
    if es.count(index="users", query={"term": {"email": email}})["count"]:
        raise HTTPException(409, "Email is already registered")
    user_id = str(uuid4())
    user = {"user_id": user_id, "workspace_id": user_id, "name": data.name, "email": email,
            "password_hash": passwords.hash(data.password), "role": "Researcher", "created_at": now()}
    save("users", user_id, user, user)
    return {k: v for k, v in user.items() if k != "password_hash"}


@router.post("/api/auth/login")
def login(data: Login):
    hits = es.search(index="users", query={"term": {"email": data.email.lower()}}, size=1)["hits"]["hits"]
    if not hits or not passwords.verify(data.password, hits[0]["_source"]["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    user = hits[0]["_source"]
    return {"access_token": make_token(user["user_id"]), "token_type": "bearer",
            "user": {k: v for k, v in user.items() if k != "password_hash"}}


@router.get("/api/auth/me")
def me(user=Depends(current_user)):
    return user


