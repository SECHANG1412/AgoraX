import React, { useState } from 'react';
import EditableContent from './EditableContent';
import CommentActions from './CommentActions';
import ReplyForm from './ReplyForm';
import { useAuth } from '../../../hooks/useAuth';

const CommentItem = ({ item, isReply = false, actions, refresh, depth = 0 }) => {
  const id = isReply ? item.reply_id : item.comment_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [replying, setReplying] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.user_id === item.user_id;

  // Indent only one level for all replies to avoid cascading indentation.
  const depthLevel = Math.min(depth, 1);
  const indentStyle = depthLevel === 0 ? {} : { marginLeft: '1.5rem' };
  const containerSpacingClass = depthLevel === 0 ? 'mb-6' : 'mt-2';

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
    // ReplyForm already prefixes with @username, so just forward.
    const parentReplyId = isReply ? item.reply_id : null;
    const success = await actions.onReply(item.comment_id, content, parentReplyId);
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
    <div className={`${containerSpacingClass}`}>
      <div
        className={`flex justify-between bg-white p-4 rounded-lg border ${item.is_deleted ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}
        style={indentStyle}
      >
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
            {item.is_deleted ? (
              <p className="mt-1 text-gray-500 text-sm italic">삭제된 댓글입니다.</p>
            ) : (
              <EditableContent
                isEditing={isEditing}
                content={item.content}
                editContent={editContent}
                setEditContent={setEditContent}
                onEdit={onEdit}
                setIsEditing={setIsEditing}
                isReply={isReply}
              />
            )}
          </div>

          <CommentActions
            hasLiked={item.has_liked}
            likeCount={item.like_count}
            onLikeClick={item.is_deleted ? undefined : onLikeClick}
            onReplyClick={item.is_deleted ? undefined : () => setReplying(!replying)}
            onEditClick={isOwner && !item.is_deleted ? () => setIsEditing(true) : undefined}
            onDeleteClick={isOwner ? onDelete : undefined}
            hideOwnerActions={!isOwner || item.is_deleted}
          />
        </div>
      </div>
      {replying && !item.is_deleted && (
        <div className={`mt-2 ${isReply ? '' : 'ml-6'}`}>
          <ReplyForm onSubmit={onReplySubmit} onCancel={() => setReplying(false)} lockedPrefix={`@${item.username}`} />
        </div>
      )}

      <div className="space-y-2">
        {item.replies?.map((reply) => (
          <CommentItem
            key={reply.reply_id}
            item={reply}
            isReply={true}
            actions={actions}
            refresh={refresh}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
};

export default CommentItem;
