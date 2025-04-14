import logging
import os
import requests
from flask import json
from dotenv import load_dotenv
from utils.util import fetch_access_token, load_destination

# .envを読み込む
load_dotenv()

# .envから読み込み
DESTINATION_NAME = os.getenv("DESTINATION_NAME")
EMBEDDING_DEPLOYMMENT_ID = os.getenv("EMBEDDING_DEPLOYMENT_ID")
EMBEDDING_API_VERSION = os.getenv("EMBEDDING_API_VERSION")
RESOURCE_GROUP = os.getenv("RESOURCE_GROUP")

class EmbeddingRepository:
    def __init__(self):
        self.__logger = logging.getLogger(__name__)

    def embed_text(self, text):
        self.__logger.info(f"Embedding text: {text}")
        embedding_list = self.__fetch_embedding(text)
        embedding_text = str([item["embedding"] for item in embedding_list])

        self.__logger.info(f"Embedded text.")
        return embedding_text
    
    def __fetch_embedding(self, text: str) -> list:
        destination = load_destination(DESTINATION_NAME)
        client_id = destination["clientId"]
        client_secret = destination["clientSecret"]
        token_url = destination["tokenServiceURL"]

        access_token = fetch_access_token(client_id, client_secret, token_url)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "AI-Resource-Group": RESOURCE_GROUP,
            "Content-Type": "application/json",
        }
        data = {"input": text}
        
        post_url = destination["URL"] + f"/v2/inference/deployments/{EMBEDDING_DEPLOYMMENT_ID}/embeddings?api-version={EMBEDDING_API_VERSION}"
        self.__logger.info(f"Going to make POST request to: {post_url}")

        response = requests.post(
            post_url,
            headers=headers,
            data=json.dumps(data),
        )
        if response.status_code != 200:
            raise Exception(f"Failed to fetch embedding: {response.text}")
        return response.json()["data"]