"""Read-only database facts for the classroom demo."""
from fastapi import APIRouter, Depends

from ..auth import current_user
from ..db import listing, workspace_query
from ..elasticsearch_client import es

router = APIRouter()
INDICES = ("users", "projects", "datasets", "experiments", "models", "training_runs")
ID_FIELDS = {
    "projects": "project_id", "datasets": "dataset_id", "experiments": "experiment_id",
    "models": "model_id", "training_runs": "run_id",
}


@router.get("/api/database/overview")
def overview(user=Depends(current_user)):
    """Return actual Elasticsearch mappings and workspace-scoped data counts."""
    mappings = es.indices.get_mapping(index=",".join(INDICES))
    result = []
    for index in INDICES:
        mapping = mappings[index]["mappings"]
        fields = [
            {"name": name, "type": spec.get("type", "object"),
             "keyword": "keyword" in spec.get("fields", {})}
            for name, spec in mapping["properties"].items()
        ]
        examples = []
        if index != "users":
            examples = [
                {"id": item[ID_FIELDS[index]], "name": item.get("name") or item.get("run_name", "")}
                for item in listing(index, user, size=3)
            ]
        result.append({
            "index": index,
            "count": es.count(index=index, query=workspace_query(user))["count"],
            "dynamic": mapping.get("dynamic", "true"),
            "fields": fields,
            "examples": examples,
        })
    return {"database": "Elasticsearch", "indices": result}
