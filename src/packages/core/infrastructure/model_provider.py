"""OpenAI provider adapter. Provider output is treated as a proposal, never a verdict."""

import json

from openai import OpenAI

from clauseguard_core.config import get_settings


class ModelProvider:
    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    @property
    def available(self) -> bool:
        return self._client is not None

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self._client is None:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        response = self._client.embeddings.create(
            model=self._settings.openai_embedding_model,
            input=texts,
            dimensions=self._settings.openai_embedding_dimensions,
        )
        return [item.embedding for item in response.data]

    def plan_queries(self, question: str, scope_description: str) -> list[str]:
        """Return query variants only; the controller enforces scope for every tool call."""
        if self._client is None:
            return [question]
        completion = self._client.chat.completions.create(
            model=self._settings.openai_generation_model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Create up to three short search queries for a contract question. "
                        "Use only the provided question; do not answer it or invent contract facts. "
                        'Return JSON: {"queries":["..."]}.'
                    ),
                },
                {"role": "user", "content": f"Scope: {scope_description}\nQuestion: {question}"},
            ],
        )
        content = completion.choices[0].message.content or "{}"
        try:
            values = json.loads(content).get("queries", [])
        except (json.JSONDecodeError, AttributeError):
            values = []
        return [question, *(str(value) for value in values[:2] if str(value).strip())]

    def grade_relevance(self, question: str, evidence: list[str]) -> str:
        if not evidence:
            return "incorrect"
        if self._client is None:
            return "ambiguous"
        completion = self._client.chat.completions.create(
            model=self._settings.openai_generation_model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Classify whether the supplied contract excerpts directly contain evidence "
                        "needed for the question. Return exactly correct, ambiguous, or incorrect. "
                        "Do not answer the question."
                    ),
                },
                {"role": "user", "content": json.dumps({"question": question, "evidence": evidence})},
            ],
        )
        grade = (completion.choices[0].message.content or "").strip().lower()
        return grade if grade in {"correct", "ambiguous", "incorrect"} else "ambiguous"

    def answer(self, question: str, evidence: list[dict[str, object]]) -> dict[str, object]:
        if self._client is None:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        completion = self._client.chat.completions.create(
            model=self._settings.openai_generation_model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Answer only from the provided evidence. Select exact evidence IDs and quote "
                        "verbatim. Do not decide a typed policy verdict. If evidence is insufficient, "
                        'return {"summary":"","citations":[]}.'
                    ),
                },
                {"role": "user", "content": json.dumps({"question": question, "evidence": evidence})},
            ],
        )
        try:
            value = json.loads(completion.choices[0].message.content or "{}")
            return value if isinstance(value, dict) else {}
        except json.JSONDecodeError:
            return {}
