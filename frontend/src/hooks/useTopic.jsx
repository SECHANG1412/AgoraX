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
      showErrorAlert(error, '토픽을 불러올 수 없습니다.');
      return null;
    } finally {
      setLoading(false);
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
      showErrorAlert(error, '토픽을 불러올 수 없습니다.');
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
        showSuccessAlert('토픽이 성공적으로 생성되었습니다.');
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, '토픽을 생성할 수 없습니다.');
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
      showErrorAlert(error, '토픽을 불러올 수 없습니다.');
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
  };
};
