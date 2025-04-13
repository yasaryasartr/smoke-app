import React, { useEffect, useState } from "react";
import { TextInput, Button, Alert, StyleSheet, Text } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import Toast from "react-native-toast-message";
import { useUser } from "@/hooks/useUser";
import api from "@/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TabTwoScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    useUser().then((user) => {
      if (user) {
        setUser(user);
        setName(user.name);
        setEmail(user.email);
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setError("");

    try {
      if (password) {
        const passwordValid =
          password.length >= 8 && // en az 8 karakter
          /[a-z]/.test(password) && // küçük harf
          /[A-Z]/.test(password) && // büyük harf
          /[^a-zA-Z0-9]/.test(password); //sembol

        if (!passwordValid) {
          setError(
            "Parola en az 8 karakter, küçük büyük harf ve sembol olmalıdır!"
          );
          return;
        }
      }

      setLoading(true);

      const profileRequest = await api.put("/users/profile", {
        name,
        email,
        password,
      });

      if (profileRequest?.data?.message == "success") {
        if (user) {
          user.name = name;
          user.email = email;
          await AsyncStorage.setItem("user", JSON.stringify(user));
        }

        Toast.show({
          type: "success",
          text1: "Profil Güncellendi",
          position: "bottom",
        });
      }

      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      if (error?.status == 409) {
        setError("Bu e-posta zaten kullanılmaktadır.");
      } else {
        setError("Kayıt Yapılamadı");
      }
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="profile"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Profilim</ThemedText>
      </ThemedView>

      <ThemedText style={styles.label}>Ad</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Adınızı girin"
        value={name}
        onChangeText={setName}
      />

      <ThemedText style={styles.label}>E-posta</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="E-posta adresinizi girin"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <ThemedView
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <ThemedText style={styles.label}>Parola</ThemedText>
        <ThemedText style={{ marginLeft: 10, fontSize: 11 }}>
          (küçük-büyük harf sembol ve min.8 karakter)
        </ThemedText>
      </ThemedView>

      <TextInput
        style={styles.input}
        placeholder="Parolanızı girin"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Kaydet" onPress={handleSubmit} disabled={loading} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    gap: 4,
  },
  container: {
    padding: 24,
    backgroundColor: "#fff",
    flex: 1,
  },
  label: {
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
});
