import { useState } from 'react';
import api from '../utils/api';
import { showErrorAlert, showSuccessAlert, handleAuthError } from '../utils/alertUtils';

export const useTopic = () => {
  const [loading, setLoading] = useState(false);

  const fetchTopics = async ({ sort, limit, offset, category, search }) => {
    setLoading(true);
    try {
      const params = {
        sort,
        limit,
        offset: offset - 1,
        category,
        ...(search && { search }),
      };
      const response = await api.get('/topics', {
        params,
      });

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      showErrorAlert(error, '토픽 목록을 불러오지 못했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const pinTopic = async (topicId) => {
    try {
      const response = await api.post(`/topics/${topicId}/pin`);
      return response.status === 200;
    } catch (error) {
      if (await handleAuthError(error)) return false;
      showErrorAlert(error, '핀 고정에 실패했습니다.');
      return false;
    }
  };

  const unpinTopic = async (topicId) => {
    try {
      const response = await api.delete(`/topics/${topicId}/pin`);
      return response.status === 200;
    } catch (error) {
      if (await handleAuthError(error)) return false;
      showErrorAlert(error, '핀 해제에 실패했습니다.');
      return false;
    }
  };

  const countAllTopics = async (category, search) => {
    setLoading(true);
    try {
      const params = {
        category,
        ...(search && { search }),
      };
      const response = await api.get('/topics/count', {
        params,
      });

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      showErrorAlert(error, '토픽 수를 불러오지 못했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async (topicData) => {
    setLoading(true);
    try {
      const response = await api.post('/topics', topicData);

      if (response.status === 200) {
        showSuccessAlert('토픽이 성공적으로 등록되었습니다.');
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, '토픽 등록에 실패했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTopicById = async (topicId) => {
    setLoading(true);
    try {
      const response = await api.get(`/topics/${topicId}`);

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      showErrorAlert(error, '토픽 정보를 불러오지 못했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteTopic = async (topicId) => {
    setLoading(true);
    try {
      const response = await api.delete(`/topics/${topicId}`);
      if (response.status === 200) {
        showSuccessAlert('토픽이 삭제되었습니다.');
        return true;
      }
      return false;
    } catch (error) {
      if (await handleAuthError(error)) return false;
      showErrorAlert(error, '토픽 삭제에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchTopics,
    countAllTopics,
    addTopic,
    getTopicById,
    deleteTopic,
    pinTopic,
    unpinTopic,
  };
};
