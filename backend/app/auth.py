from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from elasticsearch import ApiError
from passlib.context import CryptContext
from .config import settings
from .elasticsearch_client import es

passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def make_token(user_id):
    if not settings.jwt_secret:
        raise HTTPException(500, "JWT_SECRET is not configured")
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expires}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials is None:
        raise HTTPException(401, "Authentication required")
    try:
        user_id = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])["sub"]
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(401, "Invalid or expired token")
    try:
        user = es.get(index="users", id=user_id)["_source"]
    except ApiError as exc:
        if exc.status_code == 404:
            raise HTTPException(401, "Account no longer exists")
        raise
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    safe_user["workspace_id"] = safe_user.get("workspace_id", safe_user["user_id"])
    return safe_user
