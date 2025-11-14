import React from 'react';
import { voteColors } from '../../../constants/voteColors';

const OptionButton = ({ option, index, topic, onVote }) => {
  const optionCount = topic.vote_options.length;
  const isSelected = topic.has_voted && topic.user_vote_index === index;

  const bgColor = topic.has_voted && !isSelected ? '#9CA3AF' : voteColors[optionCount][index];
  const opacity = topic.has_voted && !isSelected ? 0.6 : 1;

  return (
    <button
      disabled={topic.has_voted}
      onClick={(e) => {
        e.preventDefault();
        if (!topic.has_voted) onVote(topic.topic_id, index);
      }}
      style={{ backgroundColor: bgColor, opacity }}
      className="w-full flex justify-between items-center p-2 rounded-lg text-white"
    >
      <span className="ml-2 font-semibold">{option}</span>
      <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">{topic.vote_results[index]}표</span>
    </button>
  );
};

export default OptionButton;
