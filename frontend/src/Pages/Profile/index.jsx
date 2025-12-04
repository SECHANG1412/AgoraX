import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { handleAuthError, showErrorAlert, showSuccessAlert } from '../../utils/alertUtils';

const Profile = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [stats, setStats] = useState({ topics: 0, votes: 0, likes: 0 });
  const [activities, setActivities] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatar_url') || '');
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
        setError('프로필 정보를 불러오지 못했습니다.');
        if (!(await handleAuthError(err))) {
          showErrorAlert(err, '프로필 정보를 불러오지 못했습니다.');
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
        setStats({ topics: 0, votes: 0, likes: 0 });
        if (!(await handleAuthError(err))) {
          showErrorAlert(err, '통계 정보를 불러오지 못했습니다.');
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
      showErrorAlert(new Error(''), '이름을 입력해 주세요.');
      return;
    }
    try {
      setSaving(true);
      const res = await api.put('/users/me', {
        username: form.name,
        email: form.email,
      });
      setUser({
        name: res.data.username,
        email: res.data.email,
        joinedAt: res.data.created_at?.slice(0, 10) || user?.joinedAt || '',
      });
      setEditMode(false);
      showSuccessAlert('프로필이 수정되었습니다.');
    } catch (err) {
      if (!(await handleAuthError(err))) {
        showErrorAlert(err, '프로필 수정에 실패했습니다.');
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
      <div className="flex justify-center items-center py-10 text-slate-500">
        <div className="animate-spin h-6 w-6 border-4 border-slate-400 border-t-transparent rounded-full mr-3" />
        <span>불러오는 중...</span>
      </div>
    );
  }

  if (!isAuthenticated || error) {
    return (
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-slate-600">{error || '로그인이 필요합니다.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 flex items-center justify-center text-2xl font-bold border border-slate-200">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full rounded-full object-cover border border-slate-200"
              />
            ) : (
              user?.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">{user?.name}</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="작성 토픽" value={loadingStats ? '...' : stats.topics} subtle />
          <StatCard label="투표 참여" value={loadingStats ? '...' : stats.votes} subtle />
          <StatCard label="받은 좋아요" value={loadingStats ? '...' : stats.likes} subtle />
        </div>

        {/* Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">기본 정보</h3>
              {editMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="h-10 px-4 inline-flex items-center justify-center bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60 transition shadow-sm text-sm"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={onCancel}
                    disabled={saving}
                    className="h-10 px-4 inline-flex items-center justify-center bg-white text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 hover:text-slate-900 transition text-sm"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  className="h-10 px-4 inline-flex items-center justify-center bg-white text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 hover:text-slate-900 transition text-sm"
                  onClick={() => setEditMode(true)}
                >
                  프로필 수정
                </button>
              )}
            </div>
            <div className="space-y-3">
              <Field label="이름">
                {editMode ? (
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:outline-none"
                  />
                ) : (
                  <input
                    value={user?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                  />
                )}
              </Field>
              <Field label="이메일">
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </Field>
              <Field label="가입일">
                <input
                  value={user?.joinedAt || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-slate-800"
                />
              </Field>
              <Field label="프로필 이미지" alignTop>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-slate-700 font-semibold">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <label className="px-3 py-2 text-sm bg-white text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 hover:text-slate-900 cursor-pointer">
                    이미지 선택
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const url = reader.result?.toString() || '';
                          setAvatarUrl(url);
                          localStorage.setItem('avatar_url', url);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={() => {
                        setAvatarUrl('');
                        localStorage.removeItem('avatar_url');
                      }}
                      className="text-sm text-red-500 hover:underline"
                    >
                      제거
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">최근 활동</h3>
            </div>
            {loadingActivity ? (
              <p className="text-sm text-slate-500">불러오는 중...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500">최근 활동이 없습니다.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.map((item, idx) => {
                  const topicId = item.topic_id || item.id;
                  return (
                    <ActivityRow
                      key={idx}
                      title={item.title}
                      date={new Date(item.created_at).toLocaleDateString()}
                      onView={topicId ? () => navigate(`/topic/${topicId}`) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subtle }) => (
  <div className={`p-4 rounded-xl border ${subtle ? 'border-slate-100 bg-slate-100/80' : 'border-slate-100 bg-white'} shadow-sm`}>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

const Card = ({ title, children, action }) => (
  <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {action}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1 py-2">
    <span className="text-sm text-slate-600">{label}</span>
    <div className="text-sm text-slate-800">{children}</div>
  </div>
);

const ActivityRow = ({ title, date, onView }) => (
  <div className="flex flex-col gap-2 border-b last:border-0 py-3">
    <p className="text-sm font-medium text-slate-800 leading-relaxed line-clamp-2">{title}</p>
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>{date}</span>
      <button
        onClick={onView}
        disabled={!onView}
        className={`text-xs transition ${onView ? 'text-slate-500 hover:text-slate-800' : 'text-slate-300'}`}
      >
        보기
      </button>
    </div>
  </div>
);

export default Profile;
