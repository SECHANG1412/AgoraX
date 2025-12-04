import React, { useState } from 'react';
import { FiSend, FiX } from "react-icons/fi";

const ReplyForm = ({ onSubmit, onCancel }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 mb-2">
      <div className="flex items-center space-x-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="답글을 입력하세요..."
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          rows={2}
        />
        <div className="flex flex-col space-y-2">
          <button
            type="submit"
            disabled={!content.trim()}
            className={`p-2 rounded-lg ${
              content.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FiSend className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default ReplyForm;
