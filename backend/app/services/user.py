from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.db.crud import UserCrud
from app.db.models import User
from app.db.schemas.users import UserLogin, UserCreate
from app.core.jwt_handler import get_password_hash,verify_password

class UserService:

    @staticmethod
    async def signup(db: AsyncSession, user: UserCreate) -> User:
        
        if await UserCrud.get_by_username(db, user.username):
            raise HTTPException(status_code=400, detail="이미 사용 중인 사용자 이름입니다.")
        
        hashed_pw = await get_password_hash(user.password)
        user_info = UserCreate(username=user.username, password=hashed_pw, email=user.email)
        
        try:
            db_user = await UserCrud.create(db, user_info)
            await db.commit()
            await db.refresh(db_user)
            return db_user
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=401, detail="잘못된 이메일 또는 비밀번호")
        
        
    @staticmethod
    async def login(db: AsyncSession, user: UserLogin) -> tuple:
        db_user = await UserCrud.get_by_email(db, user.email)
        if not db_user or not await verify_password(user.password, db_user.password):
            raise HTTPException(status_code=401, detail="잘못된 이메일 또는 비밀번호")

        return db_user