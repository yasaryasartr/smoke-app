import { StyleSheet, TouchableOpacity, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useEffect, useState } from "react";
import api from "@/api";
import { Button, Input, Text } from "@rneui/themed";
import { useRouter } from "expo-router";
import { Divider, Overlay } from "@rneui/base";
import LocationView from "@/components/LocationView";
import Toast from "react-native-toast-message";

const getLocationPath = (location: any) => {
  const titles = [];
  let current = location;

  while (current) {
    titles.push(current.title);
    current = current.parent;
  }

  return titles.reverse().join(" > ");
};

export default function AddDeviceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState<any>();
  const [locationPath, setLocationPath] = useState("");
  const [locationId, setLocationId] = useState();

  const changeLocation = async () => {
    if (!location) {
      Toast.show({
        type: "error",
        text1: "Konum Seçiniz",
        position: "bottom",
      });
      return;
    }

    setLocationPath(getLocationPath(location));
    setLocationId(location.id);

    setLocationDialogVisible(false);
  };

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setError("");

    if (!name || !code) {
      setError("Tüm alanlar zorunludur!");
      return;
    }

    try {
      setLoading(true);

      const register = await api.post("/devices/register", {
        locationId,
        code,
        name,
      });

      setLoading(false);

      if (register.status == 200 && register.data?.id > 0) {
        router.push(`/devices/${register.data?.id}` as any);
        return;
      }

      setError("Cihaz kaydedilemedi!");
    } catch (error: any) {
      setLoading(false);

      if (error.status === 404) {
        setError("Cihaz Bulunamadı!");
        return;
      }

      setError(error?.response?.data?.error || "Bir hata oluştu!");
    }
  };

  useEffect(() => {}, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="light.fill"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Yeni Cihaz Ekle</ThemedText>
      </ThemedView>

      <ThemedText style={styles.label}>Cihaz Kodu</ThemedText>
      <Input
        placeholder="Cihaz kodunu okutun"
        value={code}
        onChangeText={setCode}
        style={styles.input}
      />

      <ThemedText style={styles.label}>Cihaz Adı</ThemedText>
      <Input
        placeholder="Cihaz adını girin"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <ThemedText style={styles.label}>Lokasyon</ThemedText>

      <TouchableOpacity
        onPress={() => {
          setLocation(null);
          setLocationDialogVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Input
          placeholder="Konum seçin"
          value={locationPath}
          style={styles.input}
          readOnly
          pointerEvents="none"
        />
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Kaydet"
        onPress={handleSubmit}
        // disabled={loading}
      />

      <Overlay
        isVisible={locationDialogVisible}
        onBackdropPress={() => {
          setLocationDialogVisible(false);
        }}
        overlayStyle={{
          width: "90%",
          borderWidth: 1,
          borderColor: "white",
          borderRadius: 8,
          backgroundColor: "#242424",
        }}
      >
        <View style={{ padding: 20 }}>
          <Text style={{ color: "white" }}>Lokasyon Seçin:</Text>
          <Divider color="#ccc" style={{ marginTop: 10 }} />

          <View style={{ marginTop: 10 }}>
            <LocationView
              rootVisible={true}
              editable={true}
              selectable={true}
              onSelect={(item) => {
                if (item.id) {
                  setLocation(item);
                }
              }}
            />
          </View>

          <View
            style={{
              marginTop: 30,
              flexDirection: "row",
              justifyContent: "flex-end",
            }}
          >
            <Button
              title="İptal"
              type="outline"
              onPress={() => {
                setLocationDialogVisible(false);
              }}
              containerStyle={{ marginRight: 10 }}
            />
            <Button
              title="Kaydet"
              onPress={() => {
                changeLocation();
              }}
            />
          </View>
        </View>
      </Overlay>
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
  label: {
    fontWeight: "bold",
    marginTop: 12,
  },
  input: {
    color: "#fff",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
});
