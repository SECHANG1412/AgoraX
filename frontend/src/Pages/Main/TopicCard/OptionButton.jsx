import React from 'react';
import { voteColors } from '../../../constants/voteColors';

const OptionButton = ({ option, index, topic, onVote }) => {
  const optionCount = topic.vote_options.length;
  const isSelected = topic.has_voted && topic.user_vote_index === index;
  const baseColor = voteColors[optionCount][index];

  const styles = {
    backgroundColor: topic.has_voted
      ? isSelected
        ? baseColor
        : '#f8fafc'
      : '#ffffff',
    color: topic.has_voted
      ? isSelected
        ? '#ffffff'
        : '#475569'
      : baseColor,
    border: topic.has_voted
      ? isSelected
        ? `1px solid ${baseColor}`
        : '1px solid #e5e7eb'
      : `1px solid ${baseColor}`,
  };

  return (
    <button
      disabled={topic.has_voted}
      onClick={(e) => {
        e.preventDefault();
        if (!topic.has_voted) onVote(topic.topic_id, index);
      }}
      style={styles}
      className="w-full flex justify-between items-center p-2 rounded-lg text-sm font-medium transition disabled:cursor-not-allowed"
    >
      <span className="ml-1">{option}</span>
      <span className="px-2 py-0.5 rounded-full text-xs bg-white/70 text-gray-700">
        {topic.vote_results[index]}표
      </span>
    </button>
  );
};

export default OptionButton;
