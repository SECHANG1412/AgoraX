import React from 'react';
import { FaHeart, FaCommentDots } from 'react-icons/fa';

const VoteInfo = ({ createdAt, likeCount, totalVote, commentCount }) => {
  return (
    <div className="mt-auto pt-3 flex justify-between items-center text-xs text-gray-500 border-t border-gray-200">
      <span>{createdAt}</span>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-gray-500">
          <FaHeart className="text-rose-500" />
          {likeCount}
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <FaCommentDots className="text-blue-500" />
          {commentCount}
        </span>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200 font-semibold">
          총표 {totalVote}
        </span>
      </div>
    </div>
  );
};

export default VoteInfo;
