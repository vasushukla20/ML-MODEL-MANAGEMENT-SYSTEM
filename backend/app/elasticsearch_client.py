from elasticsearch import Elasticsearch
from .config import settings

es = Elasticsearch(settings.elasticsearch_url, request_timeout=20, retry_on_timeout=True)


def check_connection():
    try:
        return es.ping()
    except Exception:
        return False
