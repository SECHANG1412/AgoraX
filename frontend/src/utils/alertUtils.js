import Swal from "sweetalert2";

// Alerts are kept in ASCII to avoid encoding issues.
export const handleAuthError = async (error) => {
  if (error?.response?.status === 401) {
    await Swal.fire({
      title: "로그인이 필요해요",
      text: "해당 기능을 사용하려면 로그인해 주세요.",
      icon: "warning",
      confirmButtonText: "확인",
      confirmButtonColor: "#34D399",
    });
    return true;
  }
  return false;
};

export const showLoginRequiredAlert = async (message = "로그인 후 이용해 주세요.") => {
  await Swal.fire({
    title: "로그인이 필요합니다",
    text: message,
    icon: "warning",
    confirmButtonText: "확인",
    confirmButtonColor: "#34D399",
  });
};

export const showErrorAlert = (error, defaultMessage = "오류가 발생했습니다.") => {
  Swal.fire({
    icon: "error",
    title: "오류 발생",
    text: error?.response?.data?.error || error?.response?.data?.detail || defaultMessage,
    confirmButtonColor: "#EF4444",
  });
};

export const showSuccessAlert = (message) => {
  Swal.fire({
    icon: "success",
    title: "성공",
    text: message,
    confirmButtonColor: "#34D399",
  });
};

export const showConfirmDialog = async (
  title,
  text,
  confirmButtonText = "확인",
  cancelButtonText = "취소",
  confirmButtonColor = "#d33",
  cancelButtonColor = "#3085d6"
) => {
  return await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor,
    confirmButtonText,
    cancelButtonText,
  });
};
