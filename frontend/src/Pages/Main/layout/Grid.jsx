import React from 'react';
import TopicCard from '../TopicCard';

const Grid = ({ topics, loading, onVote, onPinToggle, isAuthenticated }) => {
  if (loading) {
    return <p className="text-center text-gray-500 col-span-2 py-6">로드하는 중...</p>;
  }

  if (topics.length === 0) {
    return <p className="text-center text-gray-500 col-span-2 py-6">등록된 토픽이 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {topics.map((topic) => (
        <TopicCard
          topic={topic}
          onVote={onVote}
          onPinToggle={onPinToggle}
          isAuthenticated={isAuthenticated}
          key={topic.topic_id}
        />
      ))}
    </div>
  );
};

export default Grid;
