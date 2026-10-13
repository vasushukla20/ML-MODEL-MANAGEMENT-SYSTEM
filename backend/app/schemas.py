from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class Register(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)


class Login(BaseModel):
    email: EmailStr
    password: str


class ProjectIn(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""


class DatasetIn(BaseModel):
    project_id: str
    name: str = Field(min_length=1)
    description: str = ""
    source: Literal["Kaggle", "HuggingFace", "TensorFlow", "OpenImages", "Custom"] = "Custom"
    size: int = Field(gt=0)
    data_type: str = Field(min_length=1)


class ExperimentIn(BaseModel):
    project_id: str
    name: str = Field(min_length=1)
    description: str = ""
    objective: str = ""
    dataset_ids: list[str] = []


class ModelDetails(BaseModel):
    input_size: str | None = None
    backbone: str | None = None
    num_layers: int | None = Field(default=None, gt=0)
    context_length: int | None = Field(default=None, gt=0)
    architecture: str | None = None
    num_parameters: int | None = Field(default=None, gt=0)


class ModelIn(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    model_type: Literal["VISION", "LLM"]
    details: ModelDetails = ModelDetails()


class VersionIn(BaseModel):
    version: str = Field(min_length=1)
    description: str = ""


class Hyperparameters(BaseModel):
    model_config = ConfigDict(extra="allow")
    learning_rate: float = Field(gt=0)
    batch_size: int = Field(gt=0)
    epochs: int = Field(gt=0)


class Metrics(BaseModel):
    accuracy: float | None = Field(default=None, ge=0, le=1)
    precision: float | None = Field(default=None, ge=0, le=1)
    recall: float | None = Field(default=None, ge=0, le=1)
    f1_score: float | None = Field(default=None, ge=0, le=1)
    loss: float | None = Field(default=None, ge=0)


class RunIn(BaseModel):
    run_name: str = Field(min_length=1)
    project_id: str
    experiment_id: str
    model_id: str
    model_version: str
    status: Literal["Running", "Completed", "Failed"] = "Running"
    hyperparameters: Hyperparameters
    metrics: Metrics = Metrics()


class MetricEntry(BaseModel):
    epoch: int = Field(gt=0)
    accuracy: float | None = Field(default=None, ge=0, le=1)
    loss: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def metric_required(self):
        if self.accuracy is None and self.loss is None:
            raise ValueError("Provide accuracy or loss")
        return self


class CheckpointIn(BaseModel):
    epoch: int = Field(gt=0)
    path: str = Field(min_length=1)


class EvaluationIn(BaseModel):
    evaluated: bool = True
    evaluation_name: str = Field(min_length=1)
    evaluation_type: str = Field(min_length=1)
    result: str = Field(min_length=1)
    notes: str = ""


class DeploymentIn(BaseModel):
    deployed: bool = True
    environment: Literal["Development", "Testing", "Production"]
    status: str = Field(min_length=1)
