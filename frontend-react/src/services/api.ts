import axios from "axios";
import config from "../config";

const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
});

// Token-Handling (Beispiel)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default api;
