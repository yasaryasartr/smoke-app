import { Image, StyleSheet, Platform } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useUser } from "@/hooks/useUser";
import { useEffect, useState } from "react";

export default function HomeScreen() {
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    useUser().then((user) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="subtitle" style={styles.titleColor}>
          Hoşgeldin {user.name}!
        </ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Lokasyonlar</ThemedText>
        <ThemedText>Cihazlarınızın bulunduğu konumları ifade eder</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Cihazlar</ThemedText>
        <ThemedText>Bağlantı ve Dedektörler Ürünlerini ifade eder</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Kullanıcılar</ThemedText>
        <ThemedText>
          Cihaz durumlarını ve bildirimleri alacak kullanıcıları ifade eder
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleColor: {
    color: "yellow",
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
