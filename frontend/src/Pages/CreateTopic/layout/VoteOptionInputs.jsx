import React from 'react';

const VoteOptionInputs = ({ formData, onOptionAdd, onOptionRemove, onOptionChange }) => {
  const voteOptions = formData.vote_options;
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        투표 옵션 <span className="text-red-500">*</span>
      </label>
      {voteOptions.map((option, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            value={option}
            onChange={(e) => onOptionChange(index, e.target.value)}
            required
            placeholder={`옵션 ${index + 1}`}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {voteOptions.length > 1 && (
            <button
              type="button"
              onClick={() => onOptionRemove(index)}
              className="p-3 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"
            >
              &times;
            </button>
          )}
        </div>
      ))}
      {voteOptions.length < 4 && (
        <button
          type="button"
          onClick={onOptionAdd}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 mt-2 font-semibold"
        >
          옵션 추가
        </button>
      )}
    </div>
  );
};

export default VoteOptionInputs;
