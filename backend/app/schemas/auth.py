"""Auth request/response schemas."""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    society: str = Field(min_length=1, max_length=64)


class UserPublic(BaseModel):
    email: str
    society: str
    role: str


class LoginResponse(BaseModel):
    user: UserPublic
    csrf_token: str


class SessionResponse(BaseModel):
    authenticated: bool
    user: UserPublic | None = None
    csrf_token: str | None = None
