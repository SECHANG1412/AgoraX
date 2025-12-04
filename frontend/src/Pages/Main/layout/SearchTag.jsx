import React from 'react';

const SearchTag = ({ search, onClear }) => {
  if (!search) return null;
  return (
    <div className="mb-4 flex items-center">
      <span className="text-gray-600 mr-2">검색어:</span>
      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center border border-blue-100">
        {search}
        <button onClick={onClear} className="ml-2 text-blue-700 hover:text-blue-900 font-semibold">
          ×
        </button>
      </div>
    </div>
  );
};

export default SearchTag;
