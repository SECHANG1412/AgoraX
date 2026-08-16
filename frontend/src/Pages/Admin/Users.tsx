import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PaginatedResponse, UserRead } from '../../types';
import api from '../../utils/api';
import { formatKoreanDateTime } from '../../utils/date';
import AdminListPagination from '../../Components/Admin/AdminListPagination';
import AdminListSearch from '../../Components/Admin/AdminListSearch';

const PAGE_SIZE = 20;

type Message = { type: 'error'; text: string };

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await api.get<PaginatedResponse<UserRead>>('/manage-api/users', {
        params: {
          ...(search && { search }),
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
      });
      setUsers(response.data.items);
      setTotal(response.data.total);
    } catch {
      setMessage({ type: 'error', text: '회원 목록을 불러오지 못했습니다.' });
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/manage" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            관리자 홈
          </Link>
          <h1 className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            회원 관리
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            가입한 회원 목록과 관리자 여부를 확인합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="min-h-11 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {isLoading ? '불러오는 중' : '새로고침'}
        </button>
      </div>

      {message && <p className="mb-4 text-sm font-semibold text-red-600">{message.text}</p>}

      <div className="mb-4">
        <AdminListSearch
          value={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="닉네임 또는 이메일 검색"
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="px-4 py-8 text-sm text-slate-500">회원 목록을 불러오는 중입니다.</p>
        ) : users.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">가입한 회원이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    회원 번호
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    닉네임
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    이메일
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    권한
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {user.user_id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {user.username}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
                          user.is_admin
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {user.is_admin ? '관리자' : '일반'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatKoreanDateTime(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && (
          <AdminListPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        )}
      </section>
    </section>
  );
};

export default AdminUsers;
