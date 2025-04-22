import logging
from flask import Flask, jsonify, request, Response
from sap.cf_logging import flask_logging
import json
import os
from flask_cors import CORS
from functools import wraps
from dotenv import load_dotenv

from repository.chat_repository import ChatRepository
from repository.embedding_repository import EmbeddingRepository
from repository.hana_repository import HanaRepository
from repository.langchain_repository import LangChainRepository

load_dotenv()  # .envファイルを読み込む

app = Flask(__name__)

# デモ環境のため、CORSを全許可（本番環境では相応の制御をかける必要がある） e.g.) CORS(app, origins=["http://localhost:3000", "https://your-frontend-app.com"])
CORS(app)

flask_logging.init(app, logging.INFO)
logger = logging.getLogger(__name__)

cf_port = None

USERNAME = os.getenv("BASIC_USER")
PASSWORD = os.getenv("BASIC_PASSWORD")

# ======================== BASIC認証用のデコレーターの定義 ======================== 

def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    """認証失敗時のレスポンス"""
    return Response(
        '認証が必要です', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'}
    )

def requires_auth(f):
    """Basic認証のデコレーター"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

# ======================== エンドポイントの定義 ======================== 

@app.route('/chat', methods=['POST'])
@requires_auth
def chat():
    chat_repository: ChatRepository = ChatRepository()
    embedding_repository: EmbeddingRepository = EmbeddingRepository()
    hana_repository: HanaRepository = HanaRepository()

    logger.info('Chat request received')

    req_body: dict = request.get_json()
    question = req_body.get('question')

    # 1. 質問に回答
    answer = chat_repository.answer_question(question)
    
    # JSONエンコーディング修正
    response_data = {
        'answer': answer
    }
    response_json = json.dumps(response_data, ensure_ascii=False)  # 日本語のエスケープを防ぐ
    return Response(response_json, content_type="application/json; charset=utf-8")


@app.route('/chain', methods=['POST'])
@requires_auth
def chain():
    logger.info("LangChain Execution Started.")
    
    # インプットをパースする
    # 質問、近似検索モード（SAP or CUSTOM）、会話履歴 を取得する
    
    try:
        req_body: dict = request.get_json()
        question = req_body.get('question', "")
        logger.info(question)
        mode = req_body.get('mode', "SAP") 
        logger.info(mode)
        history = req_body.get('history', [])
        logger.info(history)
        logger.info("Request successfully parsed.")
    except Exception as e:
        print(e)
        
    # LangChainの機能モジュールを呼び出す
    
    langchain_repository: LangChainRepository = LangChainRepository()
    answer, context = langchain_repository.execute_chain(question=question, mode=mode)
    
    # 出力形式を調整する
    history.append({
        "role": "user",
        "content": question
    })
    
    history.append({
        "role": "assistant",
        "content": answer
    })
    
    # JSONエンコーディング修正
    response_data = {
        'answer': answer,
        'mode': mode,
        'history': history,
        'context': context
    }
    response_json = json.dumps(response_data, ensure_ascii=False)  # 日本語のエスケープを防ぐ
    return Response(response_json, content_type="application/json; charset=utf-8")