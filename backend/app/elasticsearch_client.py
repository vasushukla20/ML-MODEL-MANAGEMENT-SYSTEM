from elasticsearch import Elasticsearch
from .config import settings

connection = {"request_timeout": 20, "retry_on_timeout": True}
if settings.elastic_cloud_id:
    if not settings.elastic_password:
        raise RuntimeError("ELASTIC_PASSWORD is required when ELASTIC_CLOUD_ID is set")
    es = Elasticsearch(cloud_id=settings.elastic_cloud_id,
                       basic_auth=(settings.elastic_username, settings.elastic_password), **connection)
else:
    es = Elasticsearch(settings.elasticsearch_url, **connection)


def check_connection():
    try:
        return es.ping()
    except Exception:
        return False
