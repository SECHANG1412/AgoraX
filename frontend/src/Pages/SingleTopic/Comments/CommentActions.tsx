import type { ReactNode } from 'react';
import { FaEdit, FaHeart, FaRegComment, FaTrash } from 'react-icons/fa';

type CommentActionsProps = {
  hasLiked: boolean;
  likeCount: number;
  onLikeClick?: () => void | Promise<void>;
  onReplyClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void | Promise<void>;
  hideOwnerActions?: boolean;
  reportAction?: ReactNode;
};

const CommentActions = ({
  hasLiked,
  likeCount,
  onLikeClick,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  hideOwnerActions = false,
  reportAction,
}: CommentActionsProps) => {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 sm:gap-2">
      <button
        onClick={onLikeClick}
        className={`inline-flex h-11 items-center gap-1 rounded-md px-2.5 transition-colors ${
          hasLiked ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-blue-500'
        }`}
        aria-label="좋아요"
        title="좋아요"
      >
        <FaHeart className={`h-5 w-5 ${hasLiked ? 'fill-blue-600' : 'fill-none stroke-[20] stroke-black'}`} />
        <span className="text-sm">{likeCount}</span>
      </button>

      <button
        onClick={onReplyClick}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-blue-500"
        aria-label="답글"
        title="답글"
      >
        <FaRegComment className="h-4 w-4" />
      </button>

      {reportAction}

      {!hideOwnerActions && (
        <>
          <button
            onClick={onEditClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-blue-500"
            aria-label="수정"
            title="수정"
          >
            <FaEdit className="h-4 w-4" />
          </button>
          <button
            onClick={onDeleteClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-red-500"
            aria-label="삭제"
            title="삭제"
          >
            <FaTrash className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default CommentActions;
