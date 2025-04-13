import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Input, Button, Text, CheckBox } from "@rneui/themed";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useRouter } from "expo-router";
import api from "@/api";
import { ThemedView } from "@/components/ThemedView";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegisterScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");

  const [registerType, setRegisterType] = useState<"new" | "join" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");

  const autoLogin = async () => {
    let login;

    try {
      login = await api.post("/users/login", { email, password });
    } catch (error: any) {
      if (error?.status === 500) {
        router.push("/login");
      }
    }

    if (login?.data?.token) {
      const user = login?.data;
      await AsyncStorage.setItem("user", JSON.stringify(user));
      router.push("/(tabs)");
    } else {
      router.push("/login");
    }
  };

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setError("");

    if (!registerType || !name || !email || !password || !passwordRepeat) {
      setError("Tüm alanlar zorunludur!");
      return;
    }

    if (registerType == "new" && !accountName) {
      setError("Tüm alanlar zorunludur!");
      return;
    }

    if (registerType == "join" && !accountId) {
      setError("Tüm alanlar zorunludur!");
      return;
    }

    if (step == 2 && !verificationCode) {
      setError("Doğrulama kodunu yazınız!");
      return;
    }

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

    if (password !== passwordRepeat) {
      setError("Parola ve tekrar parola uyuşmuyor!");
      return;
    }

    let params = {
      registerType,
      name,
      email,
      password,
      passwordRepeat,
      accountName,
      accountId,
      verificationCode,
    };

    let register;

    try {
      setLoading(true);
      if (step == 1) {
        const preRegister = await api.post("/users/pre-register", params);

        setLoading(false);
        if (preRegister.status == 201) {
          setStep(2);
        } else {
          setError("Kayıt yapılamadı");
        }
      } else if (step == 2) {
        register = await api.post("/users/verify-register", params);
        setLoading(false);

        if (register.status == 200 && register.data?.message == "success") {
          setSuccess(true);
        }
      }
    } catch (error: any) {
      setLoading(false);
      if (error?.status === 409) {
        if (error?.response?.data?.field == "account_name") {
          setError("Benzer hesap adı zaten var!");
        } else if (error?.response?.data?.field == "user_email") {
          setError("Benzer email ile kulanıcı zaten var!");
        } else {
          setError("Benzer kayıt zaten var!");
        }
      }
      if (error?.status === 404) {
        if (error?.response?.data?.field == "account_id") {
          setError("Hesap kodu bulunamadı!");
        } else {
          setError("Kayıt bulunamadı!");
        }
      }
      if (error?.status === 400) {
        if (error?.response?.data?.field == "verification_code") {
          setError("Doğrulama kodu hatalı!");
        } else {
          setError("İşleminiz yapılamadı!");
        }
      }
      if (error?.status === 500) {
        setError("Sunucu hatası! Lütfen daha sonra tekrar deneyin.");
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
      {success ? (
        <>
          <ThemedText style={styles.error}>Hoşgeldin {name}</ThemedText>
          <ThemedText style={styles.success}>
            Hesabınız Oluşturuldu
            <ThemedText style={styles.bigIcon}>👍</ThemedText>
          </ThemedText>
          <Button title="Devam" onPress={autoLogin} />
        </>
      ) : (
        <>
          {step == 1 && (
            <>
              <CheckBox
                checked={registerType == "new"}
                onPress={() => setRegisterType("new")}
                iconType="material-community"
                checkedIcon="radiobox-marked"
                uncheckedIcon="radiobox-blank"
                title="Yeni Hesap Oluştur"
              />
              <CheckBox
                checked={registerType == "join"}
                onPress={() => setRegisterType("join")}
                iconType="material-community"
                checkedIcon="radiobox-marked"
                uncheckedIcon="radiobox-blank"
                title="Mevcut Hesaba Katıl"
              />

              {registerType == "new" && (
                <>
                  <ThemedText style={styles.label}>
                    Hesabınıza Bir İsim Verin
                  </ThemedText>
                  <Input
                    placeholder="Hesap adınızı girin"
                    value={accountName}
                    onChangeText={setAccountName}
                    style={styles.input}
                  />
                </>
              )}

              {registerType == "join" && (
                <>
                  <ThemedText style={styles.label}>
                    NVIMAX Hesap Kodu
                  </ThemedText>
                  <Input
                    placeholder="Hesap kodunu girin"
                    value={accountId}
                    onChangeText={setAccountId}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </>
              )}

              {registerType != null && (
                <>
                  <ThemedText style={styles.label}>Ad Soyad</ThemedText>
                  <Input
                    placeholder="Adınızı girin"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                  />

                  <ThemedText style={styles.label}>E-posta</ThemedText>
                  <Input
                    placeholder="E-posta adresinizi girin"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    style={styles.input}
                  />

                  <ThemedView
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <ThemedText style={styles.label}>Parola</ThemedText>
                    <ThemedText
                      style={{ marginTop: 12, marginLeft: 10, fontSize: 11 }}
                    >
                      (küçük-büyük harf sembol ve min.8 karakter)
                    </ThemedText>
                  </ThemedView>
                  <Input
                    placeholder="Parolanızı girin"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                  />

                  <ThemedText style={styles.label}>Parola Tekrar</ThemedText>
                  <Input
                    placeholder="Parolanızı tekrar girin"
                    value={passwordRepeat}
                    onChangeText={setPasswordRepeat}
                    secureTextEntry
                    style={styles.input}
                  />

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Button
                    title="Hesap Oluştur"
                    onPress={handleSubmit}
                    disabled={loading}
                  />
                </>
              )}
            </>
          )}

          {step == 2 && (
            <>
              <ThemedText style={styles.label}>
                E-posta adresinize doğrulama kodu gönderildir.
                <br />
                Lütfen kontrol ediniz.
              </ThemedText>

              <ThemedText style={styles.label}>Doğrulama Kodu</ThemedText>
              <Input
                placeholder="Mailinize gönderilen kodu girin"
                value={verificationCode}
                onChangeText={setVerificationCode}
                style={styles.input}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                title="Doğrula"
                onPress={handleSubmit}
                // disabled={loading}
              />
            </>
          )}

          <Button
            title="Zaten hesabım var, giriş yap"
            type="clear"
            onPress={() => router.push("/login")}
          />
        </>
      )}
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
  container: {
    padding: 24,
    backgroundColor: "#fff",
    flex: 1,
  },
  label: {
    fontWeight: "bold",
  },
  bigIcon: {
    fontSize: 25,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
  success: {
    color: "lime",
    textAlign: "center",
    marginBottom: 10,
  },
  input: {
    color: "#fff",
  },
});
