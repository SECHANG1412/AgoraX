import React from 'react';
import { FaRegCalendarAlt } from 'react-icons/fa';

const InfoBar = ({ createdAt, totalVotes }) => {
  return (
    <>
      <div className="flex items-center text-gray-500 text-sm mt-4 gap-2">
        <FaRegCalendarAlt className="w-4 h-4" />
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

      <div className="text-gray-700 text-base flex items-center space-x-2 mt-2 font-semibold">
        <span className="text-gray-500">총 투표수</span>
        <span className="text-blue-700">{totalVotes}</span>
      </div>
    </>
  );
};

export default InfoBar;
