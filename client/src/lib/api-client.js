import axios from "axios";
import { HOST } from "../utils/constants";
import { getAuthToken } from "./auth-token";

export const apiClient = axios.create({
  baseURL: HOST,
  withCredentials: true, // Send cookies with requests for authentication
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
