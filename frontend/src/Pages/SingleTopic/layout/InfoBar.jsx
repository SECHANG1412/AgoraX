import React from 'react';
import { FaRegCalendarAlt } from 'react-icons/fa';

const InfoBar = ({ createdAt, totalVotes }) => {
  return (
    <>
      <div className="flex items-center text-gray-500 text-sm mt-6">
        <FaRegCalendarAlt className="w-5 h-5 mr-2" />
        <span>
          {new Date(createdAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="text-gray-600 text-lg flex items-center space-x-1 mt-2">
        <span className="font-semibold">총 투표 수:</span>
        <span className="font-bold text-emerald-600">{totalVotes}</span>
      </div>
    </>
  );
};

export default InfoBar;
