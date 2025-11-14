import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { voteColors } from '../../../constants/voteColors';
import ProgressBar from './ProgressBar';
import OptionButton from './OptionButton';
import VoteInfo from "./VoteInfo";

const TopicCard = ({ topic, onVote }) => {
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
      <div
        className={`relative flex flex-col p-4 h-full border-2 border-emerald-300 rounded-lg transition-shadow hover:shadow-lg ${
          topic.has_voted ? 'bg-gray-100' : 'bg-white'
        }`}
      >
        {topic.has_voted && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg">
            <span className="px-6 py-4 text-xl font-bold text-white bg-emerald-500 rounded-b-lg">
              이미 투표한 토픽입니다.
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <div className="mb-2 flex justify-between items-start">
            <h3 className="text-xl font-semibold text-emerald-600 line-clamp-2">{topic.title}</h3>
            {topic.category && (
              <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                {topic.category}
              </span>
            )}
          </div>

          <p className="mb-4 text-sm text-gray-500 line-clamp-2">{topic.description}</p>
          <ProgressBar voteResults={topic.vote_results} totalVote={topic.total_vote} />

          <div className="space-y-2 mb-4">
            {topic.vote_options.map((opt, idx) => (
              <OptionButton key={idx} index={idx} option={opt} topic={topic} onVote={onVote} />
            ))}
          </div>

          <VoteInfo createdAt={formattedDate} likeCount={topic.like_count} totalVote={topic.total_vote} />
        </div>
      </div>
    </Link>
  );
};

export default TopicCard;
