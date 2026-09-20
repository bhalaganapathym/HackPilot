from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail

class SuccessResponse(BaseModel, Generic[T]):
    data: T
    message: Optional[str] = None
