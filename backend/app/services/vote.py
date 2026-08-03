import re
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.crud import VoteCrud
from app.db.models import Topic
from app.db.schemas.votes import VoteCreate, VoteRead
from app.services.topic import TopicService


class VoteService:
    _MAX_SERIES_POINTS = 240

    @staticmethod
    async def create(db: AsyncSession, vote_data: VoteCreate, user_id: int) -> VoteRead:
        topic = await TopicService.get_public_topic(db, vote_data.topic_id)

        if TopicService.is_closed(topic):
            raise HTTPException(status_code=400, detail="마감된 토픽입니다.")

        if vote_data.vote_index < 0 or vote_data.vote_index >= len(topic.vote_options):
            raise HTTPException(status_code=400, detail="유효하지 않은 투표 항목입니다.")

        existing = await VoteCrud.get_by_topic_and_user(db, vote_data.topic_id, user_id)
        if existing:
            raise HTTPException(status_code=400, detail="이미 투표한 토픽입니다.")
        try:
            vote = await VoteCrud.create(db, vote_data, user_id)
            await db.commit()
            await db.refresh(vote)
            return VoteRead.model_validate(vote)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=400, detail="이미 투표한 토픽입니다.")
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
        topic = await TopicService.get_public_topic(db, topic_id)

        is_all_time = time_range.lower() == "all"
        delta = None if is_all_time else VoteService._parse_interval(time_range)

        if interval:
            interval_delta = VoteService._parse_interval(interval)
            return await VoteService._get_time_series_stats(db, topic, delta, interval_delta)
        else:
            return await VoteService._get_aggregated_stats(db, topic, delta)

    @staticmethod
    async def _get_time_series_stats(
        db: AsyncSession,
        topic: Topic,
        delta: timedelta | None,
        interval_delta: timedelta
    ):
        now = datetime.now(timezone.utc)
        if delta is None:
            first_vote_at = await VoteCrud.get_first_vote_created_at(db, topic.topic_id)
            topic_created_at = topic.created_at

            candidates = [dt for dt in (first_vote_at, topic_created_at) if dt is not None]
            if candidates:
                start_time = min(candidates)
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                else:
                    start_time = start_time.astimezone(timezone.utc)
            else:
                start_time = now
        else:
            start_time = now - delta

        interval_delta = VoteService._normalize_interval(now, start_time, interval_delta)
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
    def _normalize_interval(
        now: datetime, start_time: datetime, interval_delta: timedelta
    ) -> timedelta:
        total_seconds = max((now - start_time).total_seconds(), 0)
        if total_seconds == 0:
            return interval_delta

        points = total_seconds / max(interval_delta.total_seconds(), 1)
        if points <= VoteService._MAX_SERIES_POINTS:
            return interval_delta

        minimum_seconds = total_seconds / VoteService._MAX_SERIES_POINTS
        allowed_steps = [
            timedelta(minutes=1),
            timedelta(minutes=5),
            timedelta(minutes=15),
            timedelta(minutes=30),
            timedelta(hours=1),
            timedelta(hours=3),
            timedelta(hours=6),
            timedelta(hours=12),
            timedelta(days=1),
            timedelta(days=3),
            timedelta(weeks=1),
        ]

        for step in allowed_steps:
            if step.total_seconds() >= minimum_seconds:
                return step

        return allowed_steps[-1]

    @staticmethod
    async def _get_aggregated_stats(
        db: AsyncSession,
        topic: Topic,
        delta: timedelta | None
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
