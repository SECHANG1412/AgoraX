import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiSend, FiX } from 'react-icons/fi';

type ReplyFormProps = {
  onSubmit: (content: string) => void | Promise<void>;
  onCancel: () => void;
  lockedPrefix?: string;
};

const ReplyForm = ({ onSubmit, onCancel, lockedPrefix = '' }: ReplyFormProps) => {
  const prefix = lockedPrefix?.trim() || '';
  const [body, setBody] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    const payload = prefix ? `${prefix} ${trimmedBody}` : trimmedBody;
    onSubmit(payload);
    setBody('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-2 mt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {prefix ? (
          <span className="w-fit rounded border border-blue-100 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-600">
            {prefix}
          </span>
        ) : null}
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="답글을 입력하세요."
          className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            aria-label="답글 등록"
            disabled={!body.trim()}
            className={`flex h-11 w-11 items-center justify-center rounded-lg ${
              body.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FiSend className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="답글 작성 취소"
            onClick={onCancel}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default ReplyForm;
