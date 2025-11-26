import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
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

  return (
    <Link to={`/topic/${topic.topic_id}`}>
      <div className="relative flex flex-col p-4 h-full border border-gray-200 rounded-xl bg-white transition hover:shadow-md hover:border-blue-200">
        <div className="flex-1 flex flex-col">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {topic.has_voted && (
                <span className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full">
                  Voted
                </span>
              )}
              <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">{topic.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {topic.category && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                  {topic.category}
                </span>
              )}
              {isAuthenticated && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onPinToggle(topic.topic_id, topic.is_pinned);
                  }}
                  className="p-2 rounded-full border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition text-gray-500"
                  aria-label="핀 고정"
                >
                  {topic.is_pinned ? <BsBookmarkFill className="w-4 h-4" /> : <BsBookmark className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* description intentionally hidden */}
          <div className="mb-2" />
          <ProgressBar voteResults={topic.vote_results} totalVote={topic.total_vote} />

          <div className="space-y-2 mb-4 mt-3">
            {topic.vote_options.map((opt, idx) => (
              <OptionButton
                key={idx}
                index={idx}
                option={opt}
                topic={topic}
                onVote={onVote}
              />
            ))}
          </div>

          <VoteInfo createdAt={formattedDate} likeCount={topic.like_count} totalVote={topic.total_vote} />
        </div>
      </div>
    </Link>
  );
};

export default TopicCard;
