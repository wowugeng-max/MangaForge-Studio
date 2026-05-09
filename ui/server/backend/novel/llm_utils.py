"""
LLM 调用工具层 — 复用已有的 Provider / Adapter 体系
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.core.adapters.factory import AdapterFactory
from backend.models.provider import Provider
from backend.models.api_key import APIKey
from backend.models.model_config import ModelConfig


def _resolve_api_key(db: Session, model_id: Optional[int], provider_id: Optional[str] = None) -> tuple[Provider, APIKey]:
    """
    根据 model_id 或 provider_id 解析出 Provider 和 APIKey。
    优先 model_id -> ModelConfig -> Provider -> APIKey
    """
    if model_id:
        mc = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
        if mc:
            provider_id = mc.provider
    if not provider_id:
        # 兜底：找第一个可用的 LLM provider
        provider = db.query(Provider).filter(
            Provider.service_type == "llm",
            Provider.is_active == True,
        ).first()
        if not provider:
            raise ValueError("未找到可用的 LLM Provider")
        provider_id = provider.id

    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise ValueError(f"Provider [{provider_id}] 不存在")

    api_key = db.query(APIKey).filter(
        APIKey.provider == provider_id,
        APIKey.is_active == True,
    ).order_by(APIKey.priority.asc()).first()

    if not api_key:
        raise ValueError(f"Provider [{provider_id}] 没有可用的 API Key")

    return provider, api_key


async def call_llm(
    db: Session,
    model_id: Optional[int],
    prompt: str,
    model_name: Optional[str] = None,
    system_prompt: Optional[str] = None,
    max_tokens: int = 8000,
    temperature: float = 0.7,
) -> str:
    """
    统一的 LLM 调用入口。返回纯文本内容。
    """
    provider, api_key = _resolve_api_key(db, model_id)

    adapter_class = AdapterFactory.get_adapter(provider.id, db)
    adapter = adapter_class(provider=provider, api_key=api_key)

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    # 如果 model_id 指向 ModelConfig，使用其 model_name
    if model_id and not model_name:
        mc = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
        if mc:
            model_name = mc.model_name
    if not model_name:
        model_name = provider.default_model or "default"

    result = await adapter.generate({
        "model": model_name,
        "type": "chat",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    })

    if not result.get("success"):
        raise RuntimeError(f"LLM 调用失败: {result.get('error', '未知错误')}")

    content = result.get("content", "")
    if content is None:
        raise RuntimeError("LLM 返回空内容")
    return str(content)


def parse_json_from_text(text: str) -> Any:
    """从 LLM 返回的文本中提取 JSON（处理 markdown 代码块等情况）"""
    text = text.strip()
    # 尝试提取 ```json ... ``` 或 ``` ... ``` 块
    match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


def safe_parse_json(text: str) -> Any:
    """安全解析 JSON，失败返回原始文本"""
    try:
        return parse_json_from_text(text)
    except (json.JSONDecodeError, Exception):
        return text
