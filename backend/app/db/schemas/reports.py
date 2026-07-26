from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ReportTargetType = Literal["topic", "comment", "reply"]
ReportReason = Literal["abuse", "hate", "sexual", "spam", "privacy", "misinformation", "other"]
ReportStatus = Literal["pending", "resolved", "dismissed"]


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: int = Field(..., gt=0)
    reason: ReportReason
    detail: str | None = Field(None, max_length=500)

    @field_validator("detail")
    @classmethod
    def normalize_detail(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def require_other_detail(self):
        if self.reason == "other" and not self.detail:
            raise ValueError("detail is required when reason is other")
        return self


class ReportRead(BaseModel):
    report_id: int
    reporter_user_id: int
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    detail: str | None
    status: ReportStatus
    handled_by: int | None
    handled_at: datetime | None
    resolution: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportAdminRead(ReportRead):
    target_snapshot: dict
    reporter_name: str
    report_count: int = 1


class ReportResolutionUpdate(BaseModel):
    resolution: str = Field(..., min_length=1, max_length=500)

    @field_validator("resolution")
    @classmethod
    def resolution_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("resolution must not be blank")
        return stripped
