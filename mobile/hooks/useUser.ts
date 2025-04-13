import AsyncStorage from "@react-native-async-storage/async-storage";

export const useUser = async () => {
  let user = null;
  try {
    const userData = await AsyncStorage.getItem("user");
    if (userData) {
      user = JSON.parse(userData);
    }
  } catch (error) {}

  return user;
};
