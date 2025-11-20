from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine
from sqladmin import Admin
from app.admin.views import (
    UserAdmin,
    TopicAdmin,
    CommentAdmin,
    ReplyAdmin,
    VoteAdmin,
    TopicLikeAdmin,
    CommentLikeAdmin,
    ReplyLikeAdmin,
)


def setup_admin(app: FastAPI, engine: AsyncEngine):
    admin = Admin(app, engine)
    admin.add_view(UserAdmin)
    admin.add_view(TopicAdmin)
    admin.add_view(CommentAdmin)
    admin.add_view(ReplyAdmin)
    admin.add_view(VoteAdmin)
    admin.add_view(TopicLikeAdmin)
    admin.add_view(CommentLikeAdmin)
    admin.add_view(ReplyLikeAdmin)
