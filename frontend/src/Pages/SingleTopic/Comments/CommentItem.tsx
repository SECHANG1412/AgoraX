import { useState } from 'react';
import EditableContent from './EditableContent';
import CommentActions from './CommentActions';
import ReplyForm from './ReplyForm';
import { useAuth } from '../../../hooks/auth-context';
import { formatDateTime } from '../../../utils/date';
import type { CommentRead, ReplyRead } from '../../../types';
import type { CommentItemActions } from '.';
import ReportButton from '../../../Components/Common/ReportButton';

type CommentTreeItem = (CommentRead | ReplyRead) & {
  is_deleted?: boolean;
  reply_id?: number;
};

type CommentItemProps = {
  item: CommentTreeItem;
  isReply?: boolean;
  actions: CommentItemActions;
  refresh: () => void | Promise<void>;
  depth?: number;
};

const CommentItem = ({ item, isReply = false, actions, refresh, depth = 0 }: CommentItemProps) => {
  const id = isReply ? item.reply_id ?? item.comment_id : item.comment_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [replying, setReplying] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.user_id === item.user_id;

  // Indent only one level for all replies to avoid cascading indentation.
  const depthLevel = Math.min(depth, 1);
  const indentClass = depthLevel === 0 ? '' : 'ml-3 sm:ml-6';
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

  const onReplySubmit = async (content: string) => {
    // ReplyForm already prefixes with @username, so just forward.
    const parentReplyId = isReply ? item.reply_id ?? null : null;
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
      <div className={`rounded-lg border bg-white p-3 sm:p-4 ${indentClass} ${item.is_deleted ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
            <span className="text-blue-700 font-medium">{item.username.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <p className="font-semibold text-gray-800 truncate">{item.username}</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {formatDateTime(item.created_at, 'ko-KR', {
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
            <div className="mt-2">
              <CommentActions
                hasLiked={item.has_liked}
                likeCount={item.like_count}
                onLikeClick={item.is_deleted ? undefined : onLikeClick}
                onReplyClick={item.is_deleted ? undefined : () => setReplying(!replying)}
                onEditClick={isOwner && !item.is_deleted ? () => setIsEditing(true) : undefined}
                onDeleteClick={isOwner ? onDelete : undefined}
                hideOwnerActions={!isOwner || item.is_deleted}
                reportAction={!isOwner && !item.is_deleted ? (
                  <ReportButton
                    targetType={isReply ? 'reply' : 'comment'}
                    targetId={id}
                    compact
                  />
                ) : null}
              />
            </div>
          </div>
        </div>
      </div>
      {replying && !item.is_deleted && (
        <div className={`mt-2 ${isReply ? '' : 'ml-3 sm:ml-6'}`}>
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
