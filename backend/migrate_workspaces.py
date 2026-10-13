"""Assign existing records to their owner's workspace without deleting data.

Run once after upgrading an older shared installation. Safe to rerun.
"""
from elasticsearch.helpers import scan

from app.elasticsearch_client import es
from create_indices import create_indices

DEMO_WORKSPACE = "demo"
DEMO_EMAILS = {"researcher@demo.com", "admin@demo.com", "developer@demo.com"}
DATA_INDICES = ("projects", "datasets", "experiments", "models", "training_runs")


def documents(index):
    return list(scan(es, index=index, query={"query": {"match_all": {}}}))


def assign(index, hit, workspace_id):
    if hit["_source"].get("workspace_id") != workspace_id:
        es.update(index=index, id=hit["_id"], doc={"workspace_id": workspace_id})
        return 1
    return 0


def main():
    create_indices()
    changed = 0
    user_workspaces = {}
    for hit in documents("users"):
        user = hit["_source"]
        workspace_id = DEMO_WORKSPACE if user["email"] in DEMO_EMAILS else user.get("workspace_id", user["user_id"])
        user_workspaces[user["user_id"]] = workspace_id
        changed += assign("users", hit, workspace_id)

    project_workspaces = {}
    for hit in documents("projects"):
        project = hit["_source"]
        workspace_id = project.get("workspace_id") or user_workspaces.get(project["owner_user_id"], "legacy-unassigned")
        project_workspaces[project["project_id"]] = workspace_id
        changed += assign("projects", hit, workspace_id)

    for hit in documents("models"):
        model = hit["_source"]
        workspace_id = model.get("workspace_id") or user_workspaces.get(model["owner_user_id"], "legacy-unassigned")
        changed += assign("models", hit, workspace_id)

    for index in ("datasets", "experiments", "training_runs"):
        for hit in documents(index):
            record = hit["_source"]
            workspace_id = record.get("workspace_id") or project_workspaces.get(record["project_id"], "legacy-unassigned")
            changed += assign(index, hit, workspace_id)

    es.indices.refresh(index="users," + ",".join(DATA_INDICES))
    print(f"Workspace migration complete. Updated {changed} documents.")


if __name__ == "__main__":
    main()
