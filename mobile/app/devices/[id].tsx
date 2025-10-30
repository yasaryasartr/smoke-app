import { StyleSheet, View } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useEffect, useState } from 'react';
import {
  Button,
  Switch,
  Text,
  Slider,
  Divider,
  Overlay,
  Input,
} from '@rneui/themed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Toast from 'react-native-toast-message';
import api from '@/api';
import LocationView from '@/components/LocationView';

const getLocationPath = (location: any) => {
  const titles = [];
  let current = location;

  while (current) {
    titles.push(current.title ?? current.name);
    current = current.parent;
  }

  return titles.reverse().join(' > ');
};

export default function DeviceDetailScreen() {
  const router: any = useRouter();
  const { id } = useLocalSearchParams();

  const [visibleRename, setVisibleRename] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [device, setDevice] = useState<any>({});
  const [unregistered, setUnregistered] = useState(false);
  const [status, setStatus] = useState(false);
  const [sirenEnabled, setSirenEnabled] = useState(false);
  const [dedectorEnabled, setDedectorEnabled] = useState(false);
  const [maxTemperature, setMaxTemperature] = useState(50);
  const [workingStatus, setWorkingStatus] = useState('');
  const [location, setLocation] = useState<any>();
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);

  const lowBattery = 15; // percent
  const activityTimeout = 60; //seconds

  const changeLocation = async () => {
    if (!location) {
      Toast.show({
        type: 'error',
        text1: 'Konum Seçiniz',
        position: 'bottom',
      });
      return;
    }

    try {
      const deviceRequest = await api.put(`/devices/${device.id}`, {
        locationId: location.id,
      });

      if (deviceRequest?.data?.id) {
        device.locationPath = getLocationPath(location);
        setDevice(device);

        Toast.show({
          type: 'success',
          text1: 'Cihaz Lokasyonu Değiştirildi',
          position: 'bottom',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Kayıt Yapılamadı',
        position: 'bottom',
      });
    }

    setLocationDialogVisible(false);
  };

  const rename = async () => {
    if (!name) {
      return;
    }

    try {
      const deviceRequest = await api.put(`/devices/${device.id}`, {
        name,
      });

      if (deviceRequest?.data?.id) {
        device.name = name;
        setDevice(device);

        Toast.show({
          type: 'success',
          text1: 'Cihaz Adı Değiştirildi',
          position: 'bottom',
        });

        setVisibleRename(false);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Kayıt Yapılamadı',
        position: 'bottom',
      });
    }
  };

  const toggleStatus = async () => {
    try {
      const deviceRequest = await api.put(`/devices/${device.id}`, {
        status: status ? 0 : 1,
      });

      setStatus((prev) => !prev);

      Toast.show({
        type: !status ? 'success' : 'error',
        text1: !status ? 'Cihaz Etkinleştirildi' : 'Cihaz Devredışı',
        position: 'bottom',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Kayıt Yapılamadı',
        position: 'bottom',
      });
    }
  };

  const toggleSiren = async () => {
    setSirenEnabled((prev) => !prev);

    Toast.show({
      type: !sirenEnabled ? 'success' : 'error',
      text1: !sirenEnabled ? 'Siren Etkinleştirildi' : 'Siren Devredışı',
      position: 'bottom',
    });

    try {
      let settings: any = device.settings ?? {};
      settings.siren = !sirenEnabled;

      const updated = await api.put(`/devices/${device.id}`, { settings });

      if (updated.status == 200) {
        //işlem başarılı
      } else {
        setError('İşleminiz Yapılamadı!');
      }
    } catch (error: any) {
      if (error.status == 404) {
        setError('Cihaz Bulunamadı!');
      }
    }
  };

  const toggleDedector = async () => {
    setDedectorEnabled((prev) => !prev);

    Toast.show({
      type: !dedectorEnabled ? 'success' : 'error',
      text1: !dedectorEnabled
        ? 'Dedektör Etkinleştirildi'
        : 'Dedektör Devredışı',
      position: 'bottom',
    });
  };

  const handleDelete = async () => {
    if (loading || !device.code) {
      return;
    }

    setShowDelete(false);
    setError('');
    setLoading(true);

    try {
      const unregister = await api.delete('/devices/unregister', {
        data: { code: device.code },
      });

      if (unregister.status == 200) {
        setDevice({});
        setUnregistered(true);
      } else {
        setError('İşleminiz Yapılamadı!');
      }
    } catch (error: any) {
      if (error.status == 404) {
        setError('Cihaz Bulunamadı!');
      }
    }

    setLoading(false);
  };

  const handleHelp = async () => {
    //todo: burası yapılacak
    Toast.show({
      type: 'info',
      text1: 'Yardım Yapım Aşamasında',
      position: 'bottom',
    });
  };

  const handleTest = async () => {
    //todo: burası yapılacak
    Toast.show({
      type: 'info',
      text1: 'Cihaz test ediliyor...',
      position: 'bottom',
    });
  };

  const getDevice = async () => {
    setError('');
    setLoading(true);

    try {
      const deviceRequest = await api.get('/devices/' + id);
      if (deviceRequest.status == 200) {
        let data = deviceRequest.data;

        if (data.status == 1) {
          const lastActivity: any = data.lastActivity
            ? new Date(data.lastActivity)
            : null;
          const now: any = new Date();
          const diffInSeconds = Math.floor((now - lastActivity) / 1000);

          setStatus(true);
          if (!data.lastActivity) {
            setWorkingStatus('Bağlantı Kuruluyor');
          } else if (diffInSeconds >= activityTimeout) {
            setWorkingStatus('Bağlantı Sorunu');
          } else if (data.battery <= lowBattery) {
            setWorkingStatus('Pil Zayıf');
          } else {
            setWorkingStatus('Bağlantı Aktif');
          }
        } else {
          setStatus(false);
          setWorkingStatus('Devre Dışı');
        }

        if (data.name == null || data.name == '') {
          data.name = 'Tanımsız';
        }

        if (!data.locationId) {
          data.locationPath = 'Tanımsız';
        } else {
          data.locationPath = getLocationPath(data.location);
        }

        //todo: geçici sıcaklık değeri
        data.temperature = 20;

        if (data.lastActivity) {
          data.lastActivity = new Date(data.lastActivity).toLocaleString();
        } else {
          data.lastActivity = 'Yok';
        }

        setDevice(data);
      } else {
        setError('Cihaz Bulunamadı!');
      }
    } catch (error: any) {
      if (error.status == 404) {
        setError('Cihaz Bulunamadı!');
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    getDevice();
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
      {loading ? (
        <ThemedView>
          <ThemedText>Yükleniyor...</ThemedText>
        </ThemedView>
      ) : null}

      {device?.id > 0 ? (
        <>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Cihaz Detayları</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Cihaz Kodu</ThemedText>
            <ThemedText>{device.code}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Cihaz Adı</ThemedText>
            <ThemedText>{device.name}</ThemedText>
            <Button
              size="sm"
              title="Değiştir"
              type="outline"
              buttonStyle={{
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 4,
              }}
              titleStyle={{
                fontSize: 12,
              }}
              onPress={() => {
                setName('');
                setVisibleRename(true);
              }}
            />
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Lokasyon</ThemedText>
            <ThemedText>{device.locationPath}</ThemedText>
            <Button
              size="sm"
              title="Değiştir"
              type="outline"
              buttonStyle={{
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 4,
              }}
              titleStyle={{
                fontSize: 12,
              }}
              onPress={async () => {
                setLocation(null);
                setLocationDialogVisible(true);
              }}
            />
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Çalısma Durumu</ThemedText>
            <ThemedText>{workingStatus}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Sinyal Gücü</ThemedText>
            <ThemedText>{device.signal}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Batarya Düzeyi</ThemedText>
            <ThemedText>{device.battery}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Son Haberleşme Zamanı</ThemedText>
            <ThemedText>{device.lastActivity}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Sıcaklık</ThemedText>
            <ThemedText>{device.temperature}°C</ThemedText>
          </ThemedView>
          <Divider color="#ccc" />
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="subtitle">AYARLAR</ThemedText>
          </ThemedView>
          <ThemedView style={styles.titleContainer}>
            <ThemedText style={styles.label}>Durum</ThemedText>
            <Switch
              value={status}
              onValueChange={toggleStatus}
              color={status ? '#28a745' : '#dc3545'}
            />
          </ThemedView>

          {status && (
            <>
              <ThemedView style={styles.titleContainer}>
                <ThemedText style={styles.label}>Siren</ThemedText>
                <Switch
                  value={sirenEnabled}
                  onValueChange={toggleSiren}
                  color={sirenEnabled ? '#28a745' : '#dc3545'}
                />
              </ThemedView>
              {sirenEnabled && (
                <ThemedView style={[styles.titleContainer, { marginLeft: 15 }]}>
                  <ThemedText style={styles.label}>
                    Maks.Sıcaklık ({maxTemperature}°C)
                  </ThemedText>
                  <Slider
                    value={maxTemperature}
                    onValueChange={setMaxTemperature}
                    minimumValue={20}
                    maximumValue={60}
                    step={1}
                    style={{ width: '35%' }}
                    allowTouchTrack
                    thumbStyle={{
                      height: 20,
                      width: 20,
                      backgroundColor: '#dc3545',
                    }}
                    trackStyle={{ height: 6 }}
                    minimumTrackTintColor="#dc3545"
                  />
                </ThemedView>
              )}
              <ThemedView style={styles.titleContainer}>
                <ThemedText style={styles.label}>Dedektör</ThemedText>
                <Switch
                  value={dedectorEnabled}
                  onValueChange={toggleDedector}
                  color={dedectorEnabled ? '#28a745' : '#dc3545'}
                />
              </ThemedView>
            </>
          )}

          <Divider color="#ccc" />
          <ThemedView
            style={[styles.titleContainer, { justifyContent: 'space-between' }]}
          >
            <Button
              color="success"
              title="Cihaz Test"
              onPress={handleTest}
              disabled={loading}
            />

            <Button
              color="error"
              title="Cihazı Sil"
              onPress={() => setShowDelete(true)}
              disabled={loading}
            />

            <Button title="Yardım" onPress={handleHelp} disabled={loading} />
          </ThemedView>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {unregistered && <Text style={styles.success}>Cihazınız Kaldırıldı</Text>}

      <ThemedView style={{ marginTop: 10 }}>
        <Button
          title="Cihaz Listesine Dön"
          type="outline"
          onPress={() => {
            router.push('/devices');
          }}
          disabled={loading}
        />
      </ThemedView>

      <ConfirmDialog
        visible={showDelete}
        message="Cihazı silmek istediğinize emin misiniz?"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {/* rename device dialog */}
      <Overlay
        isVisible={visibleRename}
        onBackdropPress={() => {
          setVisibleRename(false);
        }}
      >
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 16, marginBottom: 20 }}>
            Cihaz Adını Değiştir:
            <Input
              style={{ width: 95 }}
              placeholder="Yeni cihaz adını girin"
              value={name}
              onChangeText={setName}
            />
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button
              title="İptal"
              type="outline"
              onPress={() => {
                setVisibleRename(false);
              }}
              containerStyle={{ marginRight: 10 }}
            />
            <Button
              title="Kaydet"
              onPress={() => {
                rename();
              }}
            />
          </View>
        </View>
      </Overlay>

      {/* change location dialog */}

      <Overlay
        isVisible={locationDialogVisible}
        onBackdropPress={() => {
          setLocationDialogVisible(false);
        }}
        overlayStyle={{
          width: '90%',
          borderWidth: 1,
          borderColor: 'white',
          borderRadius: 8,
          backgroundColor: '#242424',
        }}
      >
        <View style={{ padding: 20 }}>
          <Text style={{ color: 'white' }}>Lokasyon Seçin:</Text>
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
              flexDirection: 'row',
              justifyContent: 'flex-end',
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
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    marginRight: 5,
    color: '#00bcd4',
    minWidth: 115,
  },
  input: {
    color: '#fff',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  success: {
    color: 'lime',
    textAlign: 'center',
    marginBottom: 10,
  },
});
