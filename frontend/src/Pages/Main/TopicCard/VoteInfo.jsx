import React from 'react';
import { FaHeart } from 'react-icons/fa';

const VoteInfo = ({ createdAt, likeCount, totalVote }) => {
  return (
    <div className="mt-auto pt-3 flex justify-between items-center text-xs text-gray-500 border-t border-gray-200">
      <span>{createdAt}</span>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-gray-500">
          <FaHeart />
          {likeCount}
        </span>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
          총 {totalVote}표
        </span>
      </div>
    </div>
  );
};

export default VoteInfo;
