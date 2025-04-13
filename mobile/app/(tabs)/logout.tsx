import { StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function TabTwoScreen() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        await AsyncStorage.removeItem("user");
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        router.replace("/login");
      }
    };

    logout();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="users.fill"
          style={styles.headerImage}
        />
      }
    >
      <ThemedText>Çıkış Yapılıyor</ThemedText>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
