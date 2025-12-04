import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { FaHeart, FaCommentDots } from 'react-icons/fa';
import ProgressBar from './ProgressBar';
import OptionButton from './OptionButton';
import VoteInfo from './VoteInfo';

const TopicCard = ({ topic, onVote, onPinToggle, isAuthenticated }) => {
  const formattedDate = useMemo(() => {
    return new Date(topic.created_at).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [topic.created_at]);

  const commentCount = topic.comment_count ?? topic.comments_count ?? 0;

  return (
    <Link to={`/topic/${topic.topic_id}`} className="block">
      <div className="relative card flex flex-col p-4 h-full border border-gray-200 rounded-2xl bg-white transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {topic.is_pinned && (
              <span className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                Pinned
              </span>
            )}
            <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full border border-gray-200">
              {topic.category || '카테고리'}
            </span>
            {topic.has_voted && (
              <span className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                참여 완료
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                onPinToggle(topic.topic_id, topic.is_pinned);
              }}
              className="p-2 rounded-full border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition text-gray-500"
              aria-label="토픽 고정"
              title="토픽고정하기"
            >
              {topic.is_pinned ? <BsBookmarkFill className="w-4 h-4" /> : <BsBookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <h3 className="mt-2 text-xl font-bold text-gray-900 leading-snug line-clamp-2">{topic.title}</h3>

        <div className="mt-3">
          <ProgressBar voteResults={topic.vote_results} totalVote={topic.total_vote} />
          <div className="space-y-2 mt-3">
            {topic.vote_options.map((opt, idx) => (
              <OptionButton key={idx} index={idx} option={opt} topic={topic} onVote={onVote} />
            ))}
          </div>
        </div>

        <VoteInfo createdAt={formattedDate} likeCount={topic.like_count} totalVote={topic.total_vote} commentCount={commentCount} />
      </div>
    </Link>
  );
};

export default TopicCard;
