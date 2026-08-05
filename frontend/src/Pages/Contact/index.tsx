import { useCallback, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth-context';
import api from '../../utils/api';
import type { InquiryCreateRequest, InquiryRead } from '../../types';

const INITIAL_FORM = {
  title: '',
  content: '',
};

type ContactMessage = {
  type: 'success' | 'error';
  text: string;
};

const Contact = () => {
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<ContactMessage | null>(null);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setMessage(null);

      try {
        const payload: InquiryCreateRequest = {
          title: formData.title.trim(),
          content: formData.content.trim(),
        };
        await api.post<InquiryRead>('/inquiries', payload);
        setFormData(INITIAL_FORM);
        setMessage({ type: 'success', text: '문의가 접수되었습니다. 관리자 확인 후 처리 상태가 반영됩니다.' });
      } catch {
        setMessage({ type: 'error', text: '문의를 접수하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData]
  );

  if (isAuthLoading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-slate-500">로그인 상태를 확인하고 있습니다.</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          authRequired: true,
        }}
      />
    );
  }

  const isSuccess = message?.type === 'success';

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <Link to="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          홈으로 돌아가기
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">문의하기</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          서비스 이용 중 불편한 점이나 개선 의견을 남겨 주세요. 문의는 현재 로그인한 계정으로 접수됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">이름</span>
            <input
              value={user?.username || ''}
              readOnly
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              aria-label="문의 작성자 이름"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">이메일</span>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              aria-label="문의 작성자 이메일"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">제목</span>
          <input
            name="title"
            autoComplete="off"
            value={formData.title}
            onChange={handleChange}
            required
            maxLength={150}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="문의 제목을 입력해 주세요"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">문의 내용</span>
          <textarea
            name="content"
            autoComplete="off"
            value={formData.content}
            onChange={handleChange}
            required
            maxLength={2000}
            rows={7}
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="문의 내용을 입력해 주세요"
          />
        </label>

        {message && (
          <div className="space-y-2">
            <p className={`text-sm font-medium ${isSuccess ? 'text-green-700' : 'text-red-600'}`}>
              {message.text}
            </p>
            {isSuccess && (
              <Link
                to="/profile"
                className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                내 문의 내역 보러가기
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? '문의 접수 중...' : '문의 접수하기'}
        </button>
      </form>
    </section>
  );
};

export default Contact;
