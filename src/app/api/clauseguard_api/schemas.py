"""Public request and response models. Tenant IDs are intentionally absent from writes."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=320)
    password: str


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    admin_email: EmailStr
    admin_name: str = Field(min_length=1, max_length=200)
    admin_password: str = Field(min_length=12, max_length=200)


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=200)
    role: Literal["policy_owner", "reviewer", "analyst", "auditor"]
    business_unit_ids: list[str] = Field(default_factory=list)


class UnitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class FamilyCreate(BaseModel):
    business_unit_id: str
    vendor: str = ""
    contract_type: str = "other"
    effective_date: str | None = None
    status: Literal["draft", "active", "expired", "terminated"] = "active"


class RuleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    statement: str = Field(min_length=1)
    rule_type: Literal[
        "must_include", "must_not_include", "numeric_max", "numeric_min", "duration_max", "notice_within"
    ] = "must_include"
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    retrieval_topic: str = ""
    threshold: float | None = None
    unit: str = ""


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    scope_type: Literal["document", "family", "portfolio"]
    scope_id: str | None = None


class PipelineUpdate(BaseModel):
    stages: dict[str, bool]


class DocumentForceUpdate(BaseModel):
    in_force: bool


class FindingUpdate(BaseModel):
    disposition: Literal["open", "confirmed", "false_positive", "risk_accepted"]
    reason: str = ""
