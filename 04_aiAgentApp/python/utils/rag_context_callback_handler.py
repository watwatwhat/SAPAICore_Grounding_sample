import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema.agent import AgentAction, AgentFinish
from langchain.schema.document import Document
from langchain_core.outputs import ChatGeneration, LLMResult
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    ChatMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
    FunctionMessage,
)

logger = logging.getLogger(__name__)

class RagContextCallbackHandler(BaseCallbackHandler):
    def __init__(self, tool_outputs: Optional[List[Dict[str, Any]]] = None):
        super().__init__()
        # 外部から渡されたリストがあればそれを使用、なければ空のリストを使う
        self.tool_outputs = tool_outputs if tool_outputs is not None else []

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> Any:
        """ツールの実行が完了したときに呼ばれる。出力を配列に保存。"""
        logger.debug("RagContextCallbackHandler is called on tool end.")
        logger.debug(f"[on_tool_end] run_id={run_id}, output={output}")
        self.tool_outputs.append({
            # 必要であれば追加しても良いが、run_id / parent_run_id は今回は返してもしようがないのでコメントアウト
            # "run_id": str(run_id),
            # "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "tool_name": kwargs.get("name", "unknown_tool"),
            "output": output,
        })
