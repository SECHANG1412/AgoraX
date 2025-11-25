import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { handleAuthError, showErrorAlert, showSuccessAlert } from '../../utils/alertUtils';

const Profile = () => {
  const { isAuthenticated } = useAuth();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [stats, setStats] = useState({ topics: '…', votes: '…', likes: '…' });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        setLoadingStats(false);
        setLoadingActivity(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get('/users/me');
        const data = res.data;
        const mapped = {
          name: data.username,
          email: data.email,
          joinedAt: data.created_at?.slice(0, 10) || '',
        };
        setUser(mapped);
        setForm({ name: mapped.name, email: mapped.email });
        setError('');
      } catch (err) {
        setUser(null);
        setError('프로필을 불러오지 못했습니다.');
        if (!(await handleAuthError(err))) {
          showErrorAlert(err, '프로필을 불러오지 못했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      if (!isAuthenticated) {
        setLoadingStats(false);
        return;
      }
      try {
        setLoadingStats(true);
        const res = await api.get('/users/stats');
        setStats({
          topics: res.data.topics ?? 0,
          votes: res.data.votes ?? 0,
          likes: res.data.likes ?? 0,
        });
      } catch (err) {
        setStats({ topics: '—', votes: '—', likes: '—' });
        if (!(await handleAuthError(err))) {
          showErrorAlert(err, '통계를 불러오지 못했습니다.');
        }
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchActivity = async () => {
      if (!isAuthenticated) {
        setLoadingActivity(false);
        return;
      }
      try {
        setLoadingActivity(true);
        const res = await api.get('/users/activity');
        setActivities(res.data || []);
      } catch (err) {
        setActivities([]);
        if (!(await handleAuthError(err))) {
          showErrorAlert(err, '최근 활동을 불러오지 못했습니다.');
        }
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchProfile();
    fetchStats();
    fetchActivity();
  }, [isAuthenticated]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async () => {
    if (!form.name.trim()) {
      showErrorAlert(new Error(''), '이름을 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      const res = await api.put('/users/me', {
        username: form.name,
        email: form.email, // 백엔드 스키마를 유지하기 위해 전송하되, UI에서는 수정 불가
      });
      setUser({
        name: res.data.username,
        email: res.data.email,
        joinedAt: res.data.created_at?.slice(0, 10) || user?.joinedAt || '',
      });
      setEditMode(false);
      showSuccessAlert('프로필이 저장되었습니다.');
    } catch (err) {
      if (!(await handleAuthError(err))) {
        showErrorAlert(err, '프로필 저장에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setForm({ name: user?.name || '', email: user?.email || '' });
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-gray-500">
        <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />
        <span>불러오는 중...</span>
      </div>
    );
  }

  if (!isAuthenticated || error) {
    return (
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl p-8 text-center">
        <p className="text-gray-600">{error || '로그인이 필요합니다.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-8 border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-gray-500">{user?.email}</p>
          <p className="text-sm text-gray-400">가입일 {user?.joinedAt || '-'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 py-6">
        <StatCard label="작성 토픽" value={loadingStats ? '…' : stats.topics} />
        <StatCard label="투표 참여" value={loadingStats ? '…' : stats.votes} />
        <StatCard label="받은 좋아요" value={loadingStats ? '…' : stats.likes} />
      </div>

      {/* Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="기본 정보" action={
          editMode ? (
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-60 transition"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition text-sm"
              onClick={() => setEditMode(true)}
            >
              프로필 수정
            </button>
          )
        }>
          <Field label="이름">
            {editMode ? (
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <span className="text-sm font-medium text-gray-800">{user?.name || '-'}</span>
            )}
          </Field>
          <Field label="이메일">
            <span className="text-sm font-medium text-gray-800">{user?.email || '-'}</span>
          </Field>
          <Field label="가입일">
            <span className="text-sm font-medium text-gray-800">{user?.joinedAt || '-'}</span>
          </Field>
        </Card>

        <Card title="알림 설정">
          <ToggleRow label="댓글/답글 알림" enabled />
          <ToggleRow label="좋아요 알림" enabled={false} />
          <ToggleRow label="주간 요약 메일" enabled />
        </Card>

        <Card title="최근 활동">
          {loadingActivity ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-500">최근 활동이 없습니다.</p>
          ) : (
            activities.map((item, idx) => (
              <ActivityRow
                key={idx}
                title={item.title}
                date={new Date(item.created_at).toLocaleDateString()}
              />
            ))
          )}
        </Card>

        <Card title="보안">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">비밀번호</p>
              <p className="text-sm text-gray-500">마지막 변경: 2024-07-10</p>
            </div>
            <button className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">변경</button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">2단계 인증</p>
              <p className="text-sm text-gray-500">추가 보안 활성화</p>
            </div>
            <button className="px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
              설정
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const Card = ({ title, children, action }) => (
  <div className="p-5 rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, children, alignTop = false }) => (
  <div className="grid grid-cols-3 items-start gap-3 py-2">
    <span className="text-sm text-gray-600 col-span-1 pt-2">{label}</span>
    <div className={`col-span-2 ${alignTop ? '' : 'pt-1'}`}>{children}</div>
  </div>
);

const ToggleRow = ({ label, enabled }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-700">{label}</span>
    <div className={`w-11 h-6 rounded-full p-1 transition ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <div className={`w-4 h-4 bg-white rounded-full transition ${enabled ? 'translate-x-5' : ''}`} />
    </div>
  </div>
);

const ActivityRow = ({ title, date }) => (
  <div className="flex items-center justify-between border-b last:border-0 pb-2">
    <div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-gray-500">{date}</p>
    </div>
    <span className="text-xs text-gray-400">보기</span>
  </div>
);

export default Profile;
