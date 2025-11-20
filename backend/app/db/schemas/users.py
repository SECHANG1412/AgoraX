# from pydantic import BaseModel, Field
# from datetime import datetime, timezone

# class UserBase(BaseModel):
#     email: str
#     username: str
#     password: str

# class UserCreate(UserBase):
#     pass

# class UserLogin(BaseModel):
#     email: str
#     password: str

# class UserUpdate(BaseModel):
#     email: str | None = None
#     username: str | None = None
#     password: str | None = None

# class UserInDB(UserBase):
#     user_id: int
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

#     class Config:
#         from_attributes = True
    
# class UserRead(UserInDB):
#     pass

from pydantic import BaseModel, Field
from datetime import datetime, timezone

# ------------------------------
# 입력용 Base (password 포함)
# ------------------------------
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


# ------------------------------
# DB 저장 모델 (password 포함)
# ------------------------------
class UserInDB(BaseModel):
    user_id: int
    email: str
    username: str
    password: str
    created_at: datetime

    class Config:
        from_attributes = True


# ------------------------------
# 응답용 Read 모델 (password 제거)
# ------------------------------
class UserRead(BaseModel):
    user_id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True
