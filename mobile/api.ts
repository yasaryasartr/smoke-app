import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// const apiBaseUrl = "http://45.134.226.137:3001/api";
const apiBaseUrl = "http://localhost:3001/api";
// const apiBaseUrl = "http://192.168.1.20:3001/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    let user: any = await AsyncStorage.getItem("user");
    if (user) {
      try {
        user = JSON.parse(user);
      } catch (error) {}
    }
    const token = user?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export default api;
