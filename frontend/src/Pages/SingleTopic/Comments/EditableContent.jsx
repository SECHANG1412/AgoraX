import React from 'react';

const EditableContent = ({
  isEditing,
  content,
  editContent,
  setEditContent,
  onEdit,
  setIsEditing,
  isReply = false,
}) => {
  if (isEditing) {
    return (
      <div className="mt-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className={`w-full p-2 ${
            isReply ? 'text-sm' : ''
          } border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none`}
          rows={isReply ? 2 : 3}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            취소
          </button>
          <button
            onClick={onEdit}
            disabled={!editContent.trim()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-500/50"
          >
            수정
          </button>
        </div>
      </div>
    );
  }

  return <p className={`mt-1 text-gray-800 whitespace-pre-wrap ${isReply ? 'text-sm' : ''}`}>{content}</p>;
};

export default EditableContent;
