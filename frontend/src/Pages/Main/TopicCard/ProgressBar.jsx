import React from 'react';
import { voteColors } from '../../../constants/voteColors';

const ProgressBar = ({ voteResults, totalVote }) => {
  const optionCount = voteResults.length;
  let accumulated = 0;

  return (
    <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
      {voteResults.map((count, idx) => {
        const width = totalVote > 0 ? (count / totalVote) * 100 : 0;
        const left = accumulated;
        accumulated += width;

        return (
          <div
            key={idx}
            className="absolute h-full"
            style={{
              width: `${width}%`,
              left: `${left}%`,
              backgroundColor: voteColors[optionCount][idx],
            }}
          />
        );
      })}
    </div>
  );
};

export default ProgressBar;
