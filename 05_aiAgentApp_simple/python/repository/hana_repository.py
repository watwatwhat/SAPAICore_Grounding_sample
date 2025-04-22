import logging
import uuid
from hdbcli import dbapi
from vcap_services import load_from_vcap_services

from repository.embedding_repository import EmbeddingRepository

import os
import json

class HanaRepository:
    def __init__(self):
        credentials = load_from_vcap_services("hana")

        self.__schema = credentials["schema"]
        self.__connection = dbapi.connect(
            address=credentials["host"],
            port=credentials["port"],
            user=credentials["user"],
            password=credentials["password"],
            autocommit=True,
            sslValidateCertificate=False,
        )

        self.__logger = logging.getLogger(__name__)
        
    def get_related_qas_using_sap_embedding(self, query: str, top_k: int):
        self.__logger.info(f"Getting related question history.")

        cursor = self.__connection.cursor()
        cursor.execute("SET SCHEMA " + self.__schema)

        similarity_expr = f"""ROUND(COSINE_SIMILARITY(VECTOR_EMBEDDING('{query}', 'QUERY', 'SAP_NEB.20240715'),SAP_EMBEDDING), 4)"""

        query = f"""
            SELECT TOP {top_k} 
            "ID", "METADATA", "QUESTION", "ANSWER", {similarity_expr} AS "SIMILARITY"
            FROM "GPTSERVICE_QAHISTORY"
            ORDER BY {similarity_expr} DESC
        """

        try:
            cursor.execute(query)
            result = cursor.fetchall()
            self.__logger.info(f"Got related question history.")

            matched_questions = []
            for row in result:
                matched_questions.append({
                    "id": row[0],
                    "metadata": row[1],
                    "question": row[2],
                    "answer": row[3],
                    "similarity": row[4]
                })
            return matched_questions
        except Exception as e:
            self.__logger.error(f"Failed to get related question history: {e}")
            raise e
        finally:
            cursor.close()
            
    def get_related_qas_using_custom_embedding(self, query: str, top_k: int):
        self.__logger.info(f"Getting related question history.")
        
        embedding_repository: EmbeddingRepository = EmbeddingRepository()
        embedding = embedding_repository.embed_text(query)
        parsed_embedding = str(json.loads(embedding)[0])

        cursor = self.__connection.cursor()
        cursor.execute("SET SCHEMA " + self.__schema)

        similarity_expr = f"""ROUND(COSINE_SIMILARITY("CUSTOM_EMBEDDING", TO_REAL_VECTOR('{parsed_embedding}')), 4)"""

        query = f"""
            SELECT TOP {top_k} 
            "ID", "METADATA", "QUESTION", "ANSWER", {similarity_expr} AS "SIMILARITY"
            FROM "GPTSERVICE_QAHISTORY"
            ORDER BY {similarity_expr} DESC
        """

        try:
            cursor.execute(query)
            result = cursor.fetchall()
            self.__logger.info(f"Got related question history.")

            matched_questions = []
            for row in result:
                matched_questions.append({
                    "id": row[0],
                    "metadata": row[1],
                    "question": row[2],
                    "answer": row[3],
                    "similarity": row[4]
                })
            return matched_questions
        except Exception as e:
            self.__logger.error(f"Failed to get related question history: {e}")
            raise e
        finally:
            cursor.close()
