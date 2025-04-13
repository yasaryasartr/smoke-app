import { StyleSheet, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Button } from "@rneui/themed";
import { useRouter } from "expo-router";
import LocationView from "@/components/LocationView";
import { useUser } from "@/hooks/useUser";
import api from "@/api";

const getDevices = async (locationId: number) => {
  if (locationId) {
    const user: any = await useUser();
    const params: any = new URLSearchParams();
    params.append("filter[customerId]", user?.accountId);
    params.append("filter[locationId]", locationId);

    let devices = [];

    try {
      const deviceRequest = await api.get(`/devices?${params.toString()}`);
      devices = deviceRequest.data?.data;
    } catch (error) {}

    return devices;
  }

  return [];
};

const locationOpenend: any = async (item: any, setItem: any) => {

  if (item?.id) {
    const locationId: any = item.id;

    const devices: any = await getDevices(locationId);

    if (devices.length > 0) {
      if (!item.children) {
        item.children = [];
      }

      if (!item.deviceLoaded) {
        const deviceItems = devices.map((device: any) => ({
          id: device.id,
          title: device.name ?? device.code,
          type: "device",
        }));

        item.children = deviceItems.concat(item.children);
        item.deviceLoaded = true;

        setItem(item);
      }
    }
  }
};

export default function TabTwoScreen() {
  const router = useRouter();

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
      <ThemedView
        style={[
          styles.titleContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="title">Cihazlar</ThemedText>
        <Button
          type="outline"
          size="sm"
          title="Cihaz Ekle"
          onPress={() => {
            router.push("/devices/add");
          }}
        />
      </ThemedView>

      <ThemedText>
        Lokasyon seçerek cihazlarınızı görüntüleyebilirsiniz
      </ThemedText>

      <LocationView onOpen={locationOpenend} />
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
