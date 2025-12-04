import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

const VoteButtons = ({ voteOptions, voteResults, totalVotes, hasVoted, useVoteIndex, onVote, colors }) => {
  return (
    <div className="space-y-3 my-6">
      {voteOptions.map((option, idx) => {
        const selected = useVoteIndex === idx;
        const bgColor = hasVoted ? (selected ? colors[idx] : '#E5E7EB') : 'white';
        const borderColor = hasVoted ? 'transparent' : colors[idx];
        const textColor = selected ? 'text-white' : 'text-gray-700';

        return (
          <button
            key={idx}
            onClick={() => onVote(idx)}
            disabled={hasVoted}
            className={`w-full py-4 px-6 flex items-center justify-between rounded-lg text-base font-semibold transition-all duration-200 border-2
            ${hasVoted ? (selected ? 'text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed') : ''}`}
            style={{ backgroundColor: bgColor, borderColor: borderColor }}
          >
            <span>{option}</span>

            {hasVoted && (
              <div className="flex items-center gap-4">
                <span className={textColor}>{voteResults[idx]}표</span>
                <span className={textColor}>
                  {totalVotes > 0 ? Math.round((voteResults[idx] / totalVotes) * 100) : 0}%
                </span>

                {selected && <FaCheckCircle className="w-5 h-5" />}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default VoteButtons;
