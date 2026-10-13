import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ml_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    ) {
      localStorage.removeItem("ml_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
export const message = (error) => {
  const detail = error.response?.data?.detail;
  return typeof detail === "string"
    ? detail
    : Array.isArray(detail)
      ? detail
          .map((x) => `${x.field || x.loc?.at(-1)}: ${x.message || x.msg}`)
          .join(", ")
      : error.message || "Request failed";
};
export default api;
