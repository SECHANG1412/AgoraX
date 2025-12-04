import React, { useState } from 'react';
import EditableContent from './EditableContent';
import CommentActions from './CommentActions';
import ReplyForm from './ReplyForm';
import { useAuth } from '../../../hooks/useAuth';

const CommentItem = ({ item, isReply = false, actions, refresh }) => {
  const id = isReply ? item.reply_id : item.comment_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [replying, setReplying] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.user_id === item.user_id;

  const onEdit = async () => {
    const success = isReply ? await actions.onReplyEdit(id, editContent) : await actions.onEdit(id, editContent);
    if (success) {
      setIsEditing(false);
      refresh();
    }
  };

  const onLikeClick = async () => {
    const result = isReply ? await actions.onReplyLike(id) : await actions.onLike(id);
    if (result !== null) {
      refresh();
    }
  };

  const onReplySubmit = async (content) => {
    const success = await actions.onReply(item.comment_id, content);
    if (success) {
      setReplying(false);
      refresh();
    }
  };

  const onDelete = async () => {
    const success = isReply ? await actions.onReplyDelete(id) : await actions.onDelete(id);

    if (success) {
      refresh();
    }
  };

  return (
    <div className={`${isReply ? 'ml-6 mt-2' : 'mb-6'}`}>
      <div className="flex justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-start space-x-3 flex-grow">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
            <span className="text-blue-700 font-medium">{item.username.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="font-semibold text-gray-800">{item.username}</p>
              <p className="text-sm text-gray-500">
                {new Date(item.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <EditableContent
              isEditing={isEditing}
              content={item.content}
              editContent={editContent}
              setEditContent={setEditContent}
              onEdit={onEdit}
              setIsEditing={setIsEditing}
              isReply={isReply}
            />
          </div>

          <CommentActions
            hasLiked={item.has_liked}
            likeCount={item.like_count}
            onLikeClick={onLikeClick}
            onReplyClick={() => setReplying(!replying)}
            onEditClick={isOwner ? () => setIsEditing(true) : undefined}
            onDeleteClick={isOwner ? onDelete : undefined}
            hideOwnerActions={!isOwner}
          />
        </div>
      </div>
      {replying && !isReply && (
        <div className="mt-2">
          <ReplyForm onSubmit={onReplySubmit} onCancel={() => setReplying(false)} />
        </div>
      )}

      {item.replies?.map((reply) => (
        <CommentItem key={reply.reply_id} item={reply} isReply={true} actions={actions} refresh={refresh} />
      ))}
    </div>
  );
};

export default CommentItem;
