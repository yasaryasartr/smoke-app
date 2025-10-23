import { StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import api from '@/api';
import { TreeView } from '@/components/TreeView';

const getLocations = async () => {
  const user: any = await useUser();
  const params: any = new URLSearchParams();
  params.append('children', true);
  params.append('filter[parentId]', null);
  params.append('filter[accountId]', user?.accountId);

  let response;

  try {
    response = await api.get(`/locations?${params.toString()}`);
  } catch (error) {}

  return response;
};

const locationOpenend = async (item: any, setItem: any) => {
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
          title: device.code,
          type: 'device',
        }));

        item.children = deviceItems.concat(item.children);
        item.deviceLoaded = true;

        setItem(item);
      }
    }
  }
};

const getDevices = async (locationId: number) => {
  if (locationId) {
    const user: any = await useUser();
    const params: any = new URLSearchParams();
    params.append('filter[customerId]', user?.accountId);
    params.append('filter[locationId]', locationId);

    let device;
    let devices = [];

    try {
      device = await api.get(`/devices?${params.toString()}`);
      devices = device?.data?.data;
    } catch (error) {}

    return devices;
  }

  return [];
};

function renameLocations(nodes: any[]): any[] {
  return nodes.map((node) => {
    const { name, children, ...rest } = node;
    return {
      ...rest,
      title: name,
      type: 'location',
      children: children ? renameLocations(children) : [],
    };
  });
}

export default function TabTwoScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    getLocations().then((response) => {
      const newLocations: any = renameLocations(response?.data?.data);
      setLocations(newLocations);
      setLoading(false);
    });
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
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
        <ThemedText type="title">Cihazlar</ThemedText>
      </ThemedView>
      <ThemedText>
        Lokasyon seçerek cihazlarınızı görüntüleyebilirsiniz
      </ThemedText>

      {loading ? (
        <ThemedText>Yükleniyor...</ThemedText>
      ) : (
        <TreeView items={locations} onOpen={locationOpenend} />
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
