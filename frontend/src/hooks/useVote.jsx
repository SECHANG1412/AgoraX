import api from "../utils/api";
import { useAuth } from "./useAuth";
import {
  handleAuthError,
  showErrorAlert,
  showLoginRequiredAlert,
  showSuccessAlert,
} from "../utils/alertUtils";

export const useVote = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  const submitVote = async ({ topicId, voteIndex }) => {
    if (!isAuthLoading && !isAuthenticated) {
      await showLoginRequiredAlert();
      return false;
    }

    try {
      const response = await api.post("/votes", {
        topic_id: topicId,
        vote_index: voteIndex,
      });

      if (response.status === 200) {
        showSuccessAlert("투표가 성공적으로 처리되었습니다.");
        return response.data;
      }
      return null;
    } catch (error) {
      if (error.response?.status === 403) {
        showErrorAlert(error, "이미 투표한 주제입니다.");
        return false;
      }
      if (await handleAuthError(error)) return false;
      showErrorAlert(error, "투표를 진행하지 못했습니다.");
      return false;
    }
  };

  const getTopicVotes = async (topicId, timeRange = "ALL") => {
    try {
      const convertedTimeRange = timeRange === "1M" ? "30d" : timeRange;
      const isAllTime = convertedTimeRange === "ALL";

      const interval = (() => {
        switch (timeRange) {
          case "1H":
          case "6H":
            return "1m";
          case "1D":
            return "5m";
          case "1W":
            return "30m";
          case "1M":
            return "3h";
          case "ALL":
            return "12h";
          default:
            return "1m";
        }
      })();

      const params = {
        interval,
        ...(!isAllTime && { time_range: convertedTimeRange.toLowerCase() }),
      };
      const response = await api.get(`/votes/topic/${topicId}`, { params });

      if (response.status === 200) {
        const formattedData = Object.fromEntries(
          Object.entries(response.data).map(([timeStamp, voteData]) => {
            const date = new Date(timeStamp);
            const MM = String(date.getMonth() + 1).padStart(2, "0");
            const DD = String(date.getDate()).padStart(2, "0");
            const HH = String(date.getHours()).padStart(2, "0");
            const mm = String(date.getMinutes()).padStart(2, "0");
            const formattedTime = `${MM}/${DD} ${HH}:${mm}`;

            return [
              timeStamp,
              {
                ...voteData,
                formattedTime,
              },
            ];
          })
        );

        return formattedData;
      }
      return null;
    } catch (error) {
      showErrorAlert(error, "투표 데이터를 불러오지 못했습니다.");
      return null;
    }
  };

  return {
    submitVote,
    getTopicVotes,
  };
};
