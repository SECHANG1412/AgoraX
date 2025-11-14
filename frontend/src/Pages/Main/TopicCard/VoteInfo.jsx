import React from 'react';
import { FaHeart } from 'react-icons/fa';

const VoteInfo = ({ createdAt, likeCount, totalVote }) => {
  return (
    <div className="mt-auto pt-4 flex justify-between items-center text-xs text-gray-400 border-t border-gray-300">
      <span>{createdAt}</span>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <FaHeart />
          {likeCount}
        </span>
        <span className="px-2 py-0.5 bg-gray-300 text-white rounded-full">총 {totalVote}표</span>
      </div>
    </div>
  );
};

export default VoteInfo;
