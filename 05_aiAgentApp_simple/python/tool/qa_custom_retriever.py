from pydantic import BaseModel, Extra, Field
from typing import Any, Dict, Optional, Tuple
import requests
import json

from repository.hana_repository import HanaRepository

class QACustomRetriever(BaseModel):
    """
    Retriever for QA History using Custom Embeddings.
    """

    class Config:
        extra = Extra.forbid
        arbitrary_types_allowed = True
        
    def __init__(self, **data: Any):
        super().__init__(**data)
        
    def get_related_qas(self, query: str):
        hana_repository: HanaRepository = HanaRepository()
        related_qas = hana_repository.get_related_qas_using_custom_embedding(query=query, top_k=3)
        
        print(related_qas)
        
        return related_qas

    async def _arun(self, query: str, **kwargs: Any) -> str:
        """Fetch related question history from HANA Cloud using in-database vectorization async."""
        return await self.get_related_qas(query)

    def _run(self, query: str, **kwargs: Any) -> str:
        """Fetch related question history from HANA Cloud using in-database vectorization."""
        return self.get_related_qas(query)