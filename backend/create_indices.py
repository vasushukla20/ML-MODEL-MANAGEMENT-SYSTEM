from app.elasticsearch_client import es, check_connection

ID = {"type": "keyword"}
DATE = {"type": "date"}
TEXT = {"type": "text", "fields": {"keyword": {"type": "keyword"}}}
FLOAT = {"type": "float"}

MAPPINGS = {
    "users": {"user_id": ID, "name": TEXT, "email": ID, "password_hash": ID, "role": ID, "created_at": DATE},
    "projects": {"project_id": ID, "name": TEXT, "description": {"type": "text"}, "owner_user_id": ID, "created_at": DATE, "updated_at": DATE},
    "datasets": {"dataset_id": ID, "project_id": ID, "name": TEXT, "description": {"type": "text"}, "source": ID, "size": {"type": "integer"}, "data_type": ID, "created_at": DATE},
    "experiments": {"experiment_id": ID, "project_id": ID, "name": TEXT, "description": {"type": "text"}, "dataset_ids": ID, "objective": {"type": "text"}, "created_at": DATE},
    "models": {"model_id": ID, "owner_user_id": ID, "name": TEXT, "description": {"type": "text"}, "model_type": ID, "created_at": DATE, "details": {"type": "object", "dynamic": True}, "versions": {"type": "nested", "properties": {"version": ID, "description": {"type": "text"}, "created_at": DATE}}},
    "training_runs": {"run_id": ID, "run_name": TEXT, "project_id": ID, "experiment_id": ID, "model_id": ID, "model_name": TEXT, "model_version": ID, "status": ID, "start_time": DATE, "end_time": DATE, "created_at": DATE,
        "hyperparameters": {"type": "object", "dynamic": True, "properties": {"learning_rate": FLOAT, "batch_size": {"type": "integer"}, "epochs": {"type": "integer"}}},
        "metrics": {"type": "object", "properties": {"accuracy": FLOAT, "precision": FLOAT, "recall": FLOAT, "f1_score": FLOAT, "loss": FLOAT}},
        "metric_history": {"type": "nested", "properties": {"epoch": {"type": "integer"}, "accuracy": FLOAT, "loss": FLOAT, "timestamp": DATE}},
        "checkpoints": {"type": "nested", "properties": {"epoch": {"type": "integer"}, "path": {"type": "keyword"}, "created_at": DATE}},
        "evaluation": {"type": "object", "properties": {"evaluated": {"type": "boolean"}, "evaluation_name": TEXT, "evaluation_type": ID, "result": ID, "notes": {"type": "text"}}},
        "deployment": {"type": "object", "properties": {"deployed": {"type": "boolean"}, "environment": ID, "status": ID, "deployed_at": DATE}}}
}

for properties in MAPPINGS.values():
    properties["workspace_id"] = ID


def create_indices():
    if not check_connection():
        raise RuntimeError("Elasticsearch is unavailable at the configured ELASTICSEARCH_URL")
    for index, properties in MAPPINGS.items():
        if not es.indices.exists(index=index):
            es.indices.create(index=index, mappings={"dynamic": "strict", "properties": properties})
            print(f"Created {index}")
        else:
            # Adding a field to an existing mapping preserves its documents.
            es.indices.put_mapping(index=index, properties={"workspace_id": ID})
            print(f"Kept existing {index}")


if __name__ == "__main__":
    create_indices()
