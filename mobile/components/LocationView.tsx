import api from "@/api";
import { TreeView } from "@/components/TreeView";
import { ThemedText } from "@/components/ThemedText";
import { PropsWithChildren, useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { Button, Input, Text } from "@rneui/themed";
import { Divider, Overlay } from "@rneui/base";
import { StyleSheet, View } from "react-native";
import { ConfirmDialog } from "./ConfirmDialog";
import Toast from "react-native-toast-message";

type Props = PropsWithChildren<{
  rootVisible?: Boolean;
  selectable?: Boolean;
  editable?: Boolean;
  onOpen?: () => void;
  onSelect?: (item: any) => void;
}>;

const getLocations = async () => {
  const user: any = await useUser();
  const params: any = new URLSearchParams();
  params.append("children", true);
  params.append("filter[parentId]", null);
  params.append("filter[accountId]", user?.accountId);

  let response;

  try {
    response = await api.get(`/locations?${params.toString()}`);
  } catch (error) {}

  return response;
};

function renameLocations(nodes: any[]): any[] {
  return nodes.map((node) => {
    const { name, children, ...rest } = node;
    return {
      ...rest,
      title: name,
      type: "location",
      children: children ? renameLocations(children) : [],
    };
  });
}

export default function LocationView({
  onOpen,
  rootVisible = false,
  selectable = false,
  editable = false,
  onSelect = (item: any) => {},
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedItem, setSelectedItem] = useState<any>();
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [locationName, setLocationName] = useState("");

  const handleAdd = async () => {
    if (loading || !locationName) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const createLocation = await api.post("/locations", {
        name: locationName,
        parentId: selectedItem?.id ?? null,
      });

      if (createLocation.status == 201) {
        setTimeout(() => {
          initialize();
        }, 100);

        Toast.show({
          type: "success",
          text1: "Lokasyon Eklendi",
          position: "bottom",
        });

        setShowAdd(false);
        return;
      } else {
        setError("İşleminiz Yapılamadı!");
      }
    } catch (error: any) {
      if (error.status == 404) {
        setError("İşleminiz Yapılamadı!");
      } else if (error.status == 409) {
        setError("Benzer kayıt zaten var!");
      }
    }

    setLoading(false);
  };

  const handleRename = async () => {
    if (loading || !locationName || !selectedItem || !selectedItem.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const renameLocation = await api.put("/locations/" + selectedItem.id, {
        name: locationName,
      });

      if (renameLocation.status == 200) {
        setTimeout(() => {
          initialize();
        }, 100);

        Toast.show({
          type: "success",
          text1: "Yeniden Adlandırıldı",
          position: "bottom",
        });
        setShowRename(false);
        return;
      } else {
        setError("İşleminiz Yapılamadı!");
      }
    } catch (error: any) {
      if (error.status == 404) {
        setError("İşleminiz Yapılamadı!");
      } else if (error.status == 409) {
        setError("Benzer kayıt zaten var!");
      }
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (loading || !selectedItem || !selectedItem.id) {
      return;
    }

    setShowDelete(false);
    setLoading(true);
    setError("");

    try {
      const deleteLocation = await api.delete("/locations/" + selectedItem.id);

      if (deleteLocation.status == 200) {
        setTimeout(() => {
          initialize();
        }, 100);

        Toast.show({
          type: "success",
          text1: "Lokasyon Silindi",
          position: "bottom",
        });
        return;
      } else {
        setError("İşleminiz Yapılamadı!");
      }
    } catch (error: any) {
      if (error.status == 404) {
        setError("Lokasyon Bulunamadı!");
      }
    }

    setLoading(false);
  };

  const initialize = () => {
    setLoading(true);

    getLocations().then((response) => {
      let newLocations: any = renameLocations(response?.data?.data ?? []);

      if (rootVisible) {
        newLocations = [
          {
            id: "main",
            title: "Ana Lokasyon",
            type: "root",
            children: newLocations,
            isOpen: true,
            selected: selectable,
          },
        ];
      }

      setLocations(newLocations);
      setLoading(false);
    });
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <>
      {loading ? (
        <ThemedText>Yükleniyor...</ThemedText>
      ) : locations.length == 0 ? (
        <ThemedText>Kayıt Bulunamadı</ThemedText>
      ) : (
        <>
          <TreeView
            items={locations}
            rootVisible={rootVisible}
            selectable={selectable}
            onSelect={(item: any) => {
              if (item?.type == "location" && item.id > 0) {
                setError("");
                setSelectedItem(item);
              }
              if (typeof onSelect != "undefined") {
                onSelect(item);
              }
            }}
            onOpen={onOpen}
          />

          {editable && (
            <>
              <Text style={{ color: "white" }}>
                Lokasyon:
                {error && (
                  <Text style={{ color: "#ef718f", marginLeft: 10 }}>
                    ❌ {error}
                  </Text>
                )}
              </Text>
              <Divider color="white" style={{ marginBlock: 10 }} />

              <View
                style={{ flexDirection: "row", justifyContent: "flex-start" }}
              >
                <Button
                  size="sm"
                  title="Ekle"
                  type="outline"
                  onPress={() => {
                    setError("");
                    setLocationName("");
                    setShowAdd(true);
                  }}
                  titleStyle={{ fontSize: 14, color: "lime" }}
                  buttonStyle={{ borderColor: "lime" }}
                  containerStyle={{ marginRight: 10 }}
                />

                <Button
                  size="sm"
                  title="Sil"
                  type="outline"
                  onPress={() => {
                    setError("");

                    if (!selectedItem) {
                      setError("Lokasyon Seçin!");
                      return;
                    }

                    if (selectedItem.children?.length > 0) {
                      setError("Alt lokasyonu olan kayıt silinemez!");
                      return;
                    }

                    setShowDelete(true);
                  }}
                  titleStyle={{ fontSize: 14, color: "red" }}
                  buttonStyle={{ borderColor: "red" }}
                  containerStyle={{ marginRight: 10 }}
                />

                <Button
                  size="sm"
                  title="Yeniden Adlandır"
                  type="outline"
                  onPress={() => {
                    setError("");
                    setLocationName(selectedItem.title);
                    setShowRename(true);
                  }}
                  titleStyle={{ fontSize: 14, color: "orange" }}
                  buttonStyle={{ borderColor: "orange" }}
                  containerStyle={{ marginRight: 10 }}
                />
              </View>

              {/* dialog delete */}

              <ConfirmDialog
                visible={showDelete}
                message="Lokasyonu silmek istediğinize emin misiniz?"
                onConfirm={handleDelete}
                onCancel={() => setShowDelete(false)}
              />

              {/* dialog add */}
              <Overlay
                isVisible={showAdd}
                onBackdropPress={() => {
                  setShowAdd(false);
                }}
              >
                <View style={{ padding: 20 }}>
                  <Text
                    style={{ fontSize: 16, marginBottom: 20, color: "white" }}
                  >
                    Yeni Lokasyon Ekle
                  </Text>

                  <Input
                    placeholder="Bir lokasyon adı yazın"
                    value={locationName}
                    onChangeText={setLocationName}
                    style={styles.input}
                  />

                  {error && (
                    <Text style={{ color: "#ef718f", marginLeft: 10 }}>
                      ❌ {error}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 20,
                    }}
                  >
                    <Button
                      title="İptal"
                      type="outline"
                      onPress={() => {
                        setShowAdd(false);
                      }}
                      containerStyle={{ marginRight: 10 }}
                    />
                    <Button title="Onayla" onPress={handleAdd} />
                  </View>
                </View>
              </Overlay>

              {/* dialog rename */}
              <Overlay
                isVisible={showRename}
                onBackdropPress={() => {
                  setShowRename(false);
                }}
              >
                <View style={{ padding: 20 }}>
                  <Text
                    style={{ fontSize: 16, marginBottom: 20, color: "white" }}
                  >
                    Lokasyon Yeniden Adlandır
                  </Text>

                  <Input
                    placeholder="Bir lokasyon adı yazın"
                    value={locationName}
                    onChangeText={setLocationName}
                    style={styles.input}
                  />

                  {error && (
                    <Text style={{ color: "#ef718f", marginLeft: 10 }}>
                      ❌ {error}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 20,
                    }}
                  >
                    <Button
                      title="İptal"
                      type="outline"
                      onPress={() => {
                        setShowRename(false);
                      }}
                      containerStyle={{ marginRight: 10 }}
                    />
                    <Button title="Onayla" onPress={handleRename} />
                  </View>
                </View>
              </Overlay>
            </>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    color: "#fff",
  },
});
