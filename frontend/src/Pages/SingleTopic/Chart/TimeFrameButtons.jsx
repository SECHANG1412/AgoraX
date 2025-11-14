import React from 'react';

function TimeFrameButtons({ selected, onChange, loading, options }) {
  return (
    <div className="flex justify-center space-x-3 mt-4">
      {options.map((frame) => (
        <button
          key={frame}
          onClick={() => onChange(frame)}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
            selected === frame
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
              : 'border-gray-300 hover:border-emerald-500'
          }`}
        >
          {frame}
        </button>
      ))}
    </div>
  );
}

export default TimeFrameButtons;
