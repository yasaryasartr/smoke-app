import React from "react";
import { View, Text } from "react-native";
import { Overlay, Button } from "@rneui/themed";

type ConfirmDialogProps = {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  visible,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  return (
    <Overlay isVisible={visible} onBackdropPress={onCancel}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 20 }}>{message}</Text>
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Button
            title="İptal"
            type="outline"
            onPress={onCancel}
            containerStyle={{ marginRight: 10 }}
          />
          <Button title="Onayla" onPress={onConfirm} />
        </View>
      </View>
    </Overlay>
  );
};
