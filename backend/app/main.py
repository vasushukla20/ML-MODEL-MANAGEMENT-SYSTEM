"""FastAPI entry point: middleware, errors, health, and route groups."""
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import ApiError, ConnectionError as ESConnectionError

from .config import settings
from .elasticsearch_client import check_connection
from .routes import auth, projects, datasets, experiments, models, runs, analytics

app = FastAPI(title="LLM Management System API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",")],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(ESConnectionError)
async def es_unavailable(_, __):
    return JSONResponse(status_code=503, content={"detail": "Elasticsearch is unavailable. Check its connection and retry."})


@app.exception_handler(RequestValidationError)
async def invalid_request(_, exc):
    errors = [{"field": ".".join(str(x) for x in item["loc"]), "message": item["msg"]} for item in exc.errors()]
    return JSONResponse(status_code=400, content={"detail": errors})


@app.exception_handler(ApiError)
async def elasticsearch_error(_, exc):
    return JSONResponse(status_code=500, content={"detail": f"Elasticsearch request failed ({exc.status_code}). Check server logs."})


@app.get("/api/health")
def health():
    if not check_connection():
        raise HTTPException(503, "Elasticsearch is unavailable")
    return {"status": "ok", "elasticsearch": "connected"}


for router in (auth.router, projects.router, datasets.router, experiments.router,
               models.router, runs.router, analytics.router):
    app.include_router(router)
