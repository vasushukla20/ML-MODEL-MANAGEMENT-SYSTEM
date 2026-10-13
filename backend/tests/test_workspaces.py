"""Live API test: run with `python -m unittest discover -s tests`.

Requires the local API and Elasticsearch to be running. Temporary records are
removed in tearDown; existing project data is never modified.
"""
import json
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from app.elasticsearch_client import es

BASE = "http://localhost:8000/api"


def api(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(BASE + path, data=json.dumps(body).encode() if body is not None else None,
                      headers=headers, method=method)
    try:
        with urlopen(request, timeout=15) as response:
            return response.status, json.load(response)
    except HTTPError as exc:
        return exc.code, json.load(exc)


class WorkspaceIsolationTest(unittest.TestCase):
    def setUp(self):
        self.created = []
        self.accounts = []
        self.password = "test-password-123"
        self.tokens = []
        for _ in range(2):
            email = f"workspace-test-{uuid4().hex}@example.com"
            status, user = api("POST", "/auth/register", {"name": "Workspace Test", "email": email,
                "password": self.password, "role": "Admin"})
            self.assertEqual(status, 201, user)
            self.assertEqual(user["role"], "Researcher")
            self.accounts.append(user["user_id"])
            status, login = api("POST", "/auth/login", {"email": email, "password": self.password})
            self.assertEqual(status, 200, login)
            self.tokens.append(login["access_token"])
        status, demo = api("POST", "/auth/login", {"email": "researcher@demo.com", "password": "demo123"})
        self.assertEqual(status, 200, demo)
        self.demo_token = demo["access_token"]

    def tearDown(self):
        for index, doc_id in reversed(self.created):
            es.options(ignore_status=404).delete(index=index, id=doc_id, refresh="wait_for")
        for user_id in self.accounts:
            es.options(ignore_status=404).delete(index="users", id=user_id, refresh="wait_for")

    def create(self, index, path, body, token, id_field):
        status, doc = api("POST", path, body, token)
        self.assertEqual(status, 201, doc)
        self.created.append((index, doc[id_field]))
        return doc

    def test_new_accounts_are_private_and_demo_keeps_sample_data(self):
        first, second = self.tokens
        for token in (first, second):
            status, summary = api("GET", "/dashboard/summary", token=token)
            self.assertEqual(status, 200)
            self.assertEqual(summary["total_projects"], 0)
            self.assertEqual(summary["total_runs"], 0)

        project = self.create("projects", "/projects", {"name": "Private Project"}, first, "project_id")
        dataset = self.create("datasets", "/datasets", {"project_id": project["project_id"],
            "name": "Private Dataset", "source": "Custom", "size": 1, "data_type": "Images"}, first, "dataset_id")
        experiment = self.create("experiments", "/experiments", {"project_id": project["project_id"],
            "name": "Private Experiment", "dataset_ids": [dataset["dataset_id"]]}, first, "experiment_id")
        model = self.create("models", "/models", {"name": "Private Model", "model_type": "VISION"}, first, "model_id")
        status, _ = api("POST", f"/models/{model['model_id']}/versions", {"version": "1.0"}, first)
        self.assertEqual(status, 201)
        run = self.create("training_runs", "/runs", {"run_name": "Private Run",
            "project_id": project["project_id"], "experiment_id": experiment["experiment_id"],
            "model_id": model["model_id"], "model_version": "1.0",
            "hyperparameters": {"learning_rate": 0.001, "batch_size": 8, "epochs": 2}}, first, "run_id")

        resources = [("projects", project["project_id"]), ("datasets", dataset["dataset_id"]),
                     ("experiments", experiment["experiment_id"]), ("models", model["model_id"]),
                     ("runs", run["run_id"])]
        for resource, doc_id in resources:
            self.assertEqual(api("GET", f"/{resource}", token=second)[1], [])
            self.assertEqual(api("GET", f"/{resource}/{doc_id}", token=second)[0], 404)
            self.assertEqual(api("DELETE", f"/{resource}/{doc_id}", token=second)[0], 404)
            self.assertEqual(api("GET", f"/{resource}/{doc_id}", token=self.demo_token)[0], 404)
        self.assertEqual(api("POST", "/datasets", {"project_id": project["project_id"],
            "name": "Foreign", "source": "Custom", "size": 1, "data_type": "Images"}, second)[0], 404)
        self.assertEqual(api("GET", "/search?q=Private", token=second)[1]["projects"], [])
        self.assertEqual(api("GET", "/dashboard/summary", token=second)[1]["total_projects"], 0)
        self.assertGreater(api("GET", "/dashboard/summary", token=self.demo_token)[1]["total_projects"], 0)
        self.assertEqual(api("GET", "/dashboard/summary", token=first)[1]["total_projects"], 1)
        self.assertEqual(api("GET", "/dashboard/summary", token=first)[1]["total_runs"], 1)


if __name__ == "__main__":
    unittest.main()
