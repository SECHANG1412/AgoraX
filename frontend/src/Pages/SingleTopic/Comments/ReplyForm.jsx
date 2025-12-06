import React, { useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';

const ReplyForm = ({ onSubmit, onCancel, lockedPrefix = '' }) => {
  const prefix = lockedPrefix?.trim() || '';
  const [body, setBody] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    const payload = prefix ? `${prefix} ${trimmedBody}` : trimmedBody;
    onSubmit(payload);
    setBody('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 mb-2">
      <div className="flex items-center gap-3">
        {prefix ? (
          <span className="px-2 py-1 text-blue-600 font-semibold text-sm bg-blue-50 border border-blue-100 rounded">
            {prefix}
          </span>
        ) : null}
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="대댓글을 입력하세요.."
          className="flex-1 h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!body.trim()}
            className={`p-2 rounded-lg ${
              body.trim()
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
