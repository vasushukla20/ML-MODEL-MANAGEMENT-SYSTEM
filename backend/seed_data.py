"""Idempotent demo seed. Use --reset to replace only documents created by this script."""
import argparse
from datetime import datetime, timedelta, timezone
from uuid import uuid5, NAMESPACE_DNS
from app.elasticsearch_client import es
from app.auth import passwords
from create_indices import create_indices
from migrate_workspaces import DEMO_WORKSPACE


def uid(kind, name):
    return str(uuid5(NAMESPACE_DNS, f"ml-tracker-demo/{kind}/{name}"))


def timestamp(days=0):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def put(index, name, doc, reset):
    doc_id = uid(index, name)
    doc["workspace_id"] = DEMO_WORKSPACE
    if reset or not es.exists(index=index, id=doc_id):
        es.index(index=index, id=doc_id, document=doc)
    elif es.get(index=index, id=doc_id)["_source"].get("workspace_id") != DEMO_WORKSPACE:
        es.update(index=index, id=doc_id, doc={"workspace_id": DEMO_WORKSPACE})
    return doc_id


def main(reset=False):
    create_indices()
    users = [
        ("Researcher", "Vasu Shukla", "researcher@demo.com", "demo123"),
        ("Admin", "Admin User", "admin@demo.com", "admin123"),
        ("Developer", "Dev User", "developer@demo.com", "demo123"),
    ]
    for role, name, email, password in users:
        user_id = uid("users", email)
        put("users", email, {"user_id": user_id, "name": name, "email": email,
             "password_hash": passwords.hash(password), "role": role, "created_at": timestamp(30)}, reset)
    owner = uid("users", "researcher@demo.com")

    project_data = [
        ("Image Classification", "Classify everyday images using convolutional neural networks"),
        ("Language Model Research", "Explore compact transformer language models"),
        ("Vehicle Detection", "Detect vehicles in road and traffic imagery"),
        ("Sentiment Analysis", "Classify customer reviews and social media sentiment"),
    ]
    projects = {}
    for i, (name, desc) in enumerate(project_data):
        project_id = uid("projects", name)
        projects[name] = project_id
        put("projects", name, {"project_id": project_id, "name": name, "description": desc,
            "owner_user_id": owner, "created_at": timestamp(25-i), "updated_at": timestamp(2)}, reset)

    dataset_data = [
        ("CIFAR10", "Image Classification", "Kaggle", 60000, "Images"),
        ("MNIST", "Image Classification", "TensorFlow", 70000, "Images"),
        ("TextCorpus", "Language Model Research", "HuggingFace", 120000, "Text"),
        ("VehicleData", "Vehicle Detection", "Kaggle", 45000, "Images"),
        ("RoadImages", "Vehicle Detection", "OpenImages", 28000, "Images"),
        ("ReviewsData", "Sentiment Analysis", "Kaggle", 35000, "Text"),
        ("TweetsData", "Sentiment Analysis", "Custom", 52000, "Text"),
    ]
    datasets = {}
    for i, (name, project, source, size, data_type) in enumerate(dataset_data):
        dataset_id = uid("datasets", name)
        datasets[name] = dataset_id
        put("datasets", name, {"dataset_id": dataset_id, "project_id": projects[project], "name": name,
            "description": f"{name} dataset for {project.lower()}", "source": source, "size": size,
            "data_type": data_type, "created_at": timestamp(22-i)}, reset)

    experiment_data = [
        ("ResNet Baseline", "Image Classification", ["CIFAR10", "MNIST"], "Improve classification accuracy"),
        ("MiniGPT Pretraining", "Language Model Research", ["TextCorpus"], "Optimize small-model language understanding"),
        ("YOLO Testing", "Vehicle Detection", ["VehicleData", "RoadImages"], "Improve vehicle detection accuracy"),
        ("MobileNet Efficiency", "Image Classification", ["CIFAR10"], "Reduce inference cost"),
        ("Sentiment Fine-Tuning", "Sentiment Analysis", ["ReviewsData", "TweetsData"], "Classify positive and negative sentiment"),
    ]
    experiments = {}
    for i, (name, project, dataset_names, objective) in enumerate(experiment_data):
        experiment_id = uid("experiments", name)
        experiments[name] = experiment_id
        put("experiments", name, {"experiment_id": experiment_id, "project_id": projects[project],
            "name": name, "description": objective, "dataset_ids": [datasets[x] for x in dataset_names],
            "objective": objective, "created_at": timestamp(19-i)}, reset)

    model_data = [
        ("ResNet50", "VISION", "Residual neural network for image classification", {"input_size": "224x224", "backbone": "ResNet", "num_layers": 50}, ["1.0", "1.1"]),
        ("MiniGPT", "LLM", "Compact transformer language model", {"context_length": 4096, "architecture": "Transformer", "num_parameters": 7000000000}, ["1.0", "1.1"]),
        ("YOLOv8", "VISION", "Real-time object detection model", {"input_size": "640x640", "backbone": "YOLO", "num_layers": 53}, ["1.0", "1.1"]),
        ("MobileNetV3", "VISION", "Efficient mobile image classifier", {"input_size": "224x224", "backbone": "MobileNet", "num_layers": 28}, ["1.0"]),
        ("SentimentGPT", "LLM", "Language model tuned for sentiment classification", {"context_length": 2048, "architecture": "Transformer", "num_parameters": 1300000000}, ["1.0", "1.1"]),
    ]
    models = {}
    for i, (name, model_type, description, details, versions) in enumerate(model_data):
        model_id = uid("models", name)
        models[name] = model_id
        put("models", name, {"model_id": model_id, "owner_user_id": owner, "name": name,
            "description": description, "model_type": model_type, "created_at": timestamp(18-i),
            "details": details, "versions": [{"version": v, "description": "Initial version" if v == "1.0" else "Improved version", "created_at": timestamp(17-i-j)} for j, v in enumerate(versions)]}, reset)

    run_data = [
        ("ResNet_Run_1", "Image Classification", "ResNet Baseline", "ResNet50", "1.0", "Completed", .912, .25),
        ("ResNet_Run_2", "Image Classification", "ResNet Baseline", "ResNet50", "1.1", "Completed", .9478, .17),
        ("ResNet_Run_3", "Image Classification", "ResNet Baseline", "ResNet50", "1.1", "Running", None, None),
        ("MiniGPT_Run_1", "Language Model Research", "MiniGPT Pretraining", "MiniGPT", "1.0", "Completed", .824, .38),
        ("MiniGPT_Run_2", "Language Model Research", "MiniGPT Pretraining", "MiniGPT", "1.1", "Running", None, None),
        ("MiniGPT_Run_3", "Language Model Research", "MiniGPT Pretraining", "MiniGPT", "1.0", "Failed", None, None),
        ("YOLO_Run_1", "Vehicle Detection", "YOLO Testing", "YOLOv8", "1.0", "Completed", .901, .23),
        ("YOLO_Run_2", "Vehicle Detection", "YOLO Testing", "YOLOv8", "1.1", "Completed", .956, .11),
        ("YOLO_Run_3", "Vehicle Detection", "YOLO Testing", "YOLOv8", "1.1", "Running", None, None),
        ("MobileNet_Run_1", "Image Classification", "MobileNet Efficiency", "MobileNetV3", "1.0", "Completed", .887, .31),
        ("MobileNet_Run_2", "Image Classification", "MobileNet Efficiency", "MobileNetV3", "1.0", "Failed", None, None),
        ("Sentiment_Run_1", "Sentiment Analysis", "Sentiment Fine-Tuning", "SentimentGPT", "1.0", "Completed", .891, .29),
        ("Sentiment_Run_2", "Sentiment Analysis", "Sentiment Fine-Tuning", "SentimentGPT", "1.1", "Completed", .927, .20),
        ("Sentiment_Run_3", "Sentiment Analysis", "Sentiment Fine-Tuning", "SentimentGPT", "1.1", "Running", None, None),
    ]
    for i, (name, project, experiment, model, version, status, accuracy, loss) in enumerate(run_data):
        run_id = uid("training_runs", name)
        age = 14-i
        metrics = {"accuracy": accuracy, "precision": round(accuracy-.016, 3), "recall": round(accuracy-.036, 3),
                   "f1_score": round(accuracy-.026, 3), "loss": loss} if accuracy is not None else {}
        if name == "YOLO_Run_2":
            metrics = {"accuracy": .956, "precision": .94, "recall": .92, "f1_score": .93, "loss": .11}
        history = ([{"epoch": e, "accuracy": round(min(accuracy, accuracy * factor), 4),
                    "loss": round(loss / factor, 3), "timestamp": timestamp(age)}
                   for e, factor in [(1, .76), (10, .92), (30, 1)]] if accuracy is not None else [])
        checkpoints = [{"epoch": 10, "path": f"/models/{model.lower()}/{name.lower()}_epoch10.ckpt", "created_at": timestamp(age)}] if i in (1, 7, 12) else []
        evaluation = {"evaluated": True, "evaluation_name": f"{model} Validation", "evaluation_type": "Object Detection" if model == "YOLOv8" else "Classification",
                      "result": "Passed", "notes": "Strong validation performance"} if i in (1, 7, 12) else None
        deployment = {"deployed": True, "environment": "Production" if i == 7 else "Testing", "status": "Active", "deployed_at": timestamp(age-1)} if i in (7, 12) else None
        put("training_runs", name, {"run_id": run_id, "run_name": name, "project_id": projects[project],
            "experiment_id": experiments[experiment], "model_id": models[model], "model_name": model,
            "model_version": version, "status": status, "start_time": timestamp(age),
            "end_time": timestamp(age-1) if status != "Running" else None,
            "hyperparameters": {"learning_rate": .0005 if model == "YOLOv8" else .001,
                                "batch_size": 32, "epochs": 30}, "metrics": metrics,
            "metric_history": history, "checkpoints": checkpoints, "evaluation": evaluation,
            "deployment": deployment, "created_at": timestamp(age)}, reset)
    es.indices.refresh(index="users,projects,datasets,experiments,models,training_runs")
    print("Demo data ready: 3 users, 4 projects, 7 datasets, 5 experiments, 5 models, 9 versions, 14 runs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Replace deterministic demo documents only")
    main(parser.parse_args().reset)
