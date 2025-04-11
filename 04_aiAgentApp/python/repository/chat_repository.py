import logging
import os
from dotenv import load_dotenv
from gen_ai_hub.proxy.langchain.openai import ChatOpenAI
from gen_ai_hub.proxy.core.proxy_clients import get_proxy_client
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from werkzeug.exceptions import InternalServerError

# .envを読み込む
load_dotenv()

# .envから読み込み
MODEL_NAME = os.getenv("CHAT_MODEL_NAME", "gpt-4o")
RESOURCE_GROUP = os.getenv("RESOURCE_GROUP", "default")

class ChatRepository:
    def __init__(self):
        os.environ["AICORE_RESOURCE_GROUP"] = RESOURCE_GROUP

        proxy_client = get_proxy_client("gen-ai-hub")
        self.__llm = ChatOpenAI(
            proxy_model_name=MODEL_NAME,
            proxy_client=proxy_client,
            request_timeout=120,
            max_retries=2,
        )

        self.__logger = logging.getLogger(__name__)

    # 1. 質問に回答
    def answer_question(self, question):
        prompt = PromptTemplate.from_template(question)
        chain = prompt | self.__llm | StrOutputParser()

        try:
            response = chain.invoke({})
        except Exception as e:
            self.__logger.error(f"Failed to generate the answer: {e}")
            raise InternalServerError("Failed to generate the answer.")
        
        return response
    
    # 2. 回答を要約
    def summarize_answer(self, answer):
        prompt = PromptTemplate.from_template(
            """
                以下の文章を100文字以内に要約してください。

                {answer}
            """
        )

        chain = prompt | self.__llm | StrOutputParser()

        try:
            response = chain.invoke({
                "answer": answer
            })
        except Exception as e:
            self.__logger.error(f"Failed to summarize the answer: {e}")
            raise InternalServerError("Failed to summarize the answer.")
        
        logging.info(f"Summarized answer: {response}")
        return response
