import React from 'react';

const VoteOptionInputs = ({ formData, onOptionAdd, onOptionRemove, onOptionChange }) => {
  const voteOptions = formData.vote_options;
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
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
            className="flex-1 px-3.5 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none"
          />
          {voteOptions.length > 1 && (
            <button
              type="button"
              onClick={() => onOptionRemove(index)}
              className="p-3 text-slate-500 border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-800 transition"
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
          className="w-full py-2 mt-2 border border-slate-300 text-slate-800 rounded-lg bg-slate-50 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 font-semibold shadow-sm"
        >
          옵션 추가
        </button>
      )}
    </div>
  );
};

export default VoteOptionInputs;
