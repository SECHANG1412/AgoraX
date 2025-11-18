import re
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.crud import VoteCrud, TopicCrud
from app.db.models import Vote, Topic
from app.db.schemas.votes import VoteCreate, VoteRead

class VoteService:

    @staticmethod
    async def create(db: AsyncSession, vote_data: VoteCreate, user_id: int) -> VoteRead:
        existing = await VoteCrud.get_by_topic_and_user(db, vote_data.topic_id, user_id)
        if existing:
            raise HTTPException(status_code=400, detail="이미 투표하셨습니다.")
        try:
            vote = await VoteCrud.create(db, vote_data, user_id)
            await db.commit()
            await db.refresh(vote)
            return VoteRead.model_validate(vote)
        except Exception:
            await db.rollback()
            raise


    @staticmethod
    async def get_all_by_user_id(db: AsyncSession, user_id: int) -> list[VoteRead]:
        votes = await VoteCrud.get_all_by_user_id(db, user_id)
        return [VoteRead.model_validate(v) for v in votes]
    
    
    @staticmethod
    async def get_statistics(
        db: AsyncSession, topic_id: int, time_range: str, interval: str | None
    ):
        topic = await TopicCrud.get_by_id(db, topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="해당 토픽을 찾을 수 없습니다.")

        delta = VoteService._parse_interval(time_range)

        if interval:
            interval_delta = VoteService._parse_interval(interval)
            return await VoteService._get_time_series_stats(db, topic, delta, interval_delta)
        else:
            return await VoteService._get_aggregated_stats(db, topic, delta)
    

    @staticmethod
    async def _get_time_series_stats(
        db: AsyncSession,
        topic: Topic,
        delta: timedelta,
        interval_delta: timedelta
    ):
        now = datetime.now(timezone.utc)
        start_time = now - delta
        option_len = len(topic.vote_options)

        votes = await VoteCrud.get_all_by_topic_id_and_range(
            db, topic.topic_id, delta, order_by_created=True
        )

        pointer = 0
        cumulative_counts = {i: 0 for i in range(option_len)}
        result = {}
        current_time = start_time

        while current_time < now:
            next_time = current_time + interval_delta
            while (
                pointer < len(votes)
                and votes[pointer].created_at.astimezone(timezone.utc) < next_time
            ):
                vote = votes[pointer]
                cumulative_counts[vote.vote_index] += 1
                pointer += 1

            result[str(current_time)] = VoteService._format_vote_counts(cumulative_counts)
            current_time = next_time

        return result
    

    @staticmethod
    async def _get_aggregated_stats(
        db: AsyncSession,
        topic: Topic,
        delta: timedelta
    ):
        votes = await VoteCrud.get_all_by_topic_id_and_range(db, topic.topic_id, delta)
        counts = {i: 0 for i in range(len(topic.vote_options))}
        for v in votes:
            counts[v.vote_index] += 1
        return VoteService._format_vote_counts(counts)


    @staticmethod
    def _format_vote_counts(counts: dict[int, int]) -> dict[str, dict[str, float | int]]:
        total = sum(counts.values())
        return {
            str(i): {
                "count": counts[i],
                "percent": round(counts[i] / total * 100, 2) if total else 0
            }
            for i in counts
        }


    @staticmethod
    def _parse_interval(interval_str: str) -> timedelta:
        match = re.match(r"(\d+)([smhdw])", interval_str)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid interval format.")
        value, unit = match.groups()
        value = int(value)
        return {
            "s": timedelta(seconds=value),
            "m": timedelta(minutes=value),
            "h": timedelta(hours=value),
            "d": timedelta(days=value),
            "w": timedelta(weeks=value),
        }[unit]