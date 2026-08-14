import { AxiosError, AxiosHeaders } from 'axios';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute, ProtectedRoute } from './App';
import { useAuth } from './hooks/auth-context';
import api from './utils/api';

vi.mock('./hooks/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedGet = vi.mocked(api.get);

const setAuthState = ({
  isAuthenticated,
  isAuthLoading = false,
}: {
  isAuthenticated: boolean;
  isAuthLoading?: boolean;
}) => {
  mockedUseAuth.mockReturnValue({
    error: '',
    isAuthenticated,
    isAuthLoading,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    user: null,
  });
};

const createAxiosError = (status: number) =>
  new AxiosError('request failed', undefined, undefined, undefined, {
    data: null,
    status,
    statusText: 'request failed',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const renderProtectedRoute = () =>
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/login" element={<p>로그인 화면</p>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <p>보호된 화면</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const renderAdminRoute = () =>
  render(
    <MemoryRouter initialEntries={['/manage']}>
      <Routes>
        <Route path="/login" element={<p>로그인 화면</p>} />
        <Route path="/manage" element={<AdminRoute />}>
          <Route index element={<p>관리자 화면</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('인증 경로 보호', () => {
  beforeEach(() => {
    setAuthState({ isAuthenticated: true });
    mockedGet.mockResolvedValue({ data: { user_id: 1, is_admin: true } });
  });

  it('인증 확인 중에는 로딩 상태를 표시한다', () => {
    setAuthState({ isAuthenticated: false, isAuthLoading: true });

    renderProtectedRoute();

    expect(screen.getByText('로그인 상태를 확인하는 중입니다.')).toBeInTheDocument();
  });

  it('비로그인 사용자를 로그인 화면으로 이동시킨다', async () => {
    setAuthState({ isAuthenticated: false });

    renderProtectedRoute();

    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('로그인 사용자에게 보호된 화면을 표시한다', () => {
    renderProtectedRoute();

    expect(screen.getByText('보호된 화면')).toBeInTheDocument();
  });

  it('관리자 확인이 성공하면 관리자 화면을 표시한다', async () => {
    renderAdminRoute();

    expect(await screen.findByText('관리자 화면')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/manage-api/me');
  });

  it('관리자 확인이 403으로 실패하면 권한 없음 화면을 표시한다', async () => {
    mockedGet.mockRejectedValue(createAxiosError(403));

    renderAdminRoute();

    expect(await screen.findByText('관리자만 접근할 수 있습니다.')).toBeInTheDocument();
  });

  it('관리자 확인이 401로 실패하면 로그인 화면으로 이동시킨다', async () => {
    mockedGet.mockRejectedValue(createAxiosError(401));

    renderAdminRoute();

    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('관리자 확인 중 일반 오류가 발생하면 오류 화면을 표시한다', async () => {
    mockedGet.mockRejectedValue(new Error('network error'));

    renderAdminRoute();

    expect(await screen.findByText('관리자 권한을 확인하지 못했습니다.')).toBeInTheDocument();
  });
});
