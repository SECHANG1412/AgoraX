import axios from "axios";
import { showLoginRequiredAlert, showErrorAlert } from "./alertUtils";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, tokenRefreshed) => {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(tokenRefreshed);
    }
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If unauthorized, attempt refresh token once.
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // queue the request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(Promise.reject);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/users/refresh"); // assumes backend refresh endpoint sets cookies
        processQueue(null, true);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await showLoginRequiredAlert("세션이 만료되었습니다. 다시 로그인해 주세요.");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, propagate
    return Promise.reject(error);
  }
);

export default api;
