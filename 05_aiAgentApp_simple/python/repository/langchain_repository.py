import os
import logging
from langchain.chains import LLMMathChain
from langchain_core.tools import Tool
from gen_ai_hub.proxy.core.proxy_clients import get_proxy_client
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from gen_ai_hub.proxy.langchain.openai import OpenAIEmbeddings, ChatOpenAI
from dotenv import load_dotenv

from tool.qa_custom_retriever import QACustomRetriever
from utils.rag_context_callback_handler import RagContextCallbackHandler

# .envを読み込む
load_dotenv()

# .envから読み込み
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME")
CHAT_MODEL_NAME = os.getenv("CHAT_MODEL_NAME")
RESOURCE_GROUP = os.getenv("RESOURCE_GROUP")

# LangChainを呼び出すためのクラス
class LangChainRepository:
    def __init__(self):
        os.environ["AICORE_RESOURCE_GROUP"] = RESOURCE_GROUP
        
        proxy_client = get_proxy_client("gen-ai-hub")
        self.__llm = ChatOpenAI(
            proxy_model_name=CHAT_MODEL_NAME,
            proxy_client=proxy_client,
            request_timeout=120,
            max_retries=2
        )
        
        self.__embedding = OpenAIEmbeddings(
            proxy_model_name=EMBEDDING_MODEL_NAME,
            proxy_client=proxy_client
        )

        self.__logger = logging.getLogger(__name__)

    # LangChainによるRAGを実行
    def execute_chain(self, question, mode="SAP", history=[]):
            
        print(f"[INFO] Running Chain with {CHAT_MODEL_NAME}")
    
        input = f"""
            {question} 
            回答を作成するために利用した情報ソースも併せて教えてください。
        """
        
        # ============================ ツールを準備 ============================
        problem_chain = LLMMathChain.from_llm(llm=self.__llm)
        math_tool = Tool.from_function(
            name="計算機",
            func=problem_chain.run,
            description="計算が必要な場合はこのツールを利用できる。ただし、math expressions のみを入力すること。"
        )

        tools = [
            math_tool
        ]

        # 外部でEmbeddingを行い、近似検索を実施するために "text-embedding-ada-002" モデルを使用する
        print("text-embedding-ada-002 を使って、外部でEmbeddingして近似検索")
        qa_custom_retriever = QACustomRetriever()
        qa_custom_retriever_tool = Tool(
            name="SAPに関する知識DBへのクエリ(CustomEmbedding)",
            description="SAPに関する質問について調べたい場合は、このツールを利用する。metadatareferenceという項目がある場合には、それを明示して回答に利用すること。",
            func=qa_custom_retriever._run,
            coroutine=qa_custom_retriever._arun,
        )
        tools.append(qa_custom_retriever_tool)
        
        # LangChainのループを回している内部プロンプト。本来は明記する必要もないが、今回はわかりやすくするために、ここも自力で記述する形式をとっている。
        # 下手に書き換えるとLangChainの動作シーケンスが壊れてクラッシュするため、ここの内容はいじらないのが原則。
        template = """ 
            You are a great AI-Assistant that has access to additional tools in order to answer the following questions as best you can. Always answer in the same language as the user question. You have access to the following tools:

            {tools}

            To use a tool, please use the following format:

            '''
            Thought: Do I need to use a tool? Yes
            Action: the action to take, should be one of [{tool_names}]
            Action Input: the input to the action
            Observation: the result of the action
            ... (this Thought/Action/Action Input/Observation can repeat N times)
            '''

            When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:
            '''
            Thought: Do I need to use a tool? No
            Final Answer: [your response here]
            '''


            These keywords must never be translated and transformed:
                - Action:
                - Thought:
                - Action Input:
                because they are part of the thinking process instead of the output.


            Begin!

            Question: {input}
            Thought:{agent_scratchpad}
        """

        prompt = PromptTemplate.from_template(template)
        
        # プロンプトや、LLM APIのインスタンス、ツールセットを渡してエージェントのインスタンスを作成
        agent = create_react_agent(
            llm=self.__llm,
            tools=tools,
            prompt=prompt
        )
        
        # ============ Langfuseのハンドラ ================
        from langfuse.callback import CallbackHandler
        langfuse_handler = CallbackHandler(
            public_key="pk-XX-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
            secret_key="sk-XX-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
            host="http://<IPAddress>:<port>"
        )
        
        # ============ LangChainのRAGコンテキストを抽出するカスタムコールバックハンドラ ================
        # ============ なぜか動いていない? ================
        tool_outputs = []
        rag_context_handler = RagContextCallbackHandler(tool_outputs=tool_outputs)
        
        agent_executor = AgentExecutor.from_agent_and_tools(
            agent=agent,
            tools=tools, 
            handle_parsing_errors=True, 
            verbose=True,
            max_iterations=5
        )
        
        # ============ LangChainのExecutorにコールバックハンドラを組み込む ================
        # LangChainのシーケンス内の特定のポイントで、複数のコールバックハンドラで定義した任意の動作を実行することができる
        # 今回の場合は、Langfuseにログを送信する処理や、RAGの際のコンテキストとして抽出された内容（テキスト、近似度など）を配列に格納する処理を実行している
        response = agent_executor.invoke({"input": input}, config={"callbacks": [langfuse_handler, rag_context_handler]})
        
        return response.get("output"), tool_outputs