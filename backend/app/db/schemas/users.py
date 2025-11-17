from pydantic import BaseModel, Field
from datetime import datetime, timezone

class UserBase(BaseModel):
    email: str
    username: str
    password: str

class UserCreate(UserBase):
    pass

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    email: str | None = None
    username: str | None = None
    password: str | None = None

class UserInDB(UserBase):
    user_id: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True
    
class UserRead(UserInDB):
    pass
