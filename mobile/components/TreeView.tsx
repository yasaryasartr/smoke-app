import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";

type TreeNode = {
  id: number;
  title: string;
  type?: string;
  selected?: Boolean;
  children?: TreeNode[];
};

type TreeViewProps = {
  items: TreeNode[];
  onOpen?: (item: any, setItem: any) => void;
  onSelect?: (item: any) => void;
  selectable?: Boolean;
  rootVisible?: Boolean;
};

export function TreeView({
  items,
  onOpen,
  selectable = false,
  rootVisible = false,
  onSelect = () => {},
}: TreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<any[]>([]);
  const [nodeList, setNodeList] = useState(items);
  const [selectedItem, setSelectedItem] = useState<any>();
  const router = useRouter();

  useEffect(() => {
    if (rootVisible && items.length > 0) {
      setSelectedItem(items[0]);
      setExpandedNodes(["root-main"]);
    }
  }, []);

  const handleToggle = (node: any) => {
    if (selectable) {
      if (selectedItem) {
        selectedItem.selected = false;
      }

      setSelectedItem(node);
      node.selected = true;
      onSelect(node);
    }

    if (node.type == "device") {
      router.push(`/devices/${node?.id}` as any);
      return;
    }

    if (node.type == "root") {
      return;
    }

    setExpandedNodes((prev: any) => {
      const nodes = prev.includes(node.type + "-" + node.id)
        ? prev.filter((key: any) => key !== node.type + "-" + node.id)
        : [...prev, node.type + "-" + node.id];

      const isOpen = nodes.includes(node.type + "-" + node.id);

      node.children?.map((child: any) => {
        child.parent = node;
      });

      if (isOpen && onOpen) {
        onOpen(node, (newNode: any) => {
          setNodeList((prevItems: any[]) => {
            const updatedItems = [...prevItems].map((item) => {
              if (node.type == item.type && node.id == item.id) {
                return {
                  ...item,
                  newNode,
                };
              }
              return item;
            });
            return updatedItems;
          });
        });
      }

      return nodes;
    });
  };

  const renderTree = (nodes: TreeNode[]) => {
    return nodes.map((node) => {
      return (
        <Collapsible
          key={`${node.type}-${node.id}`}
          id={node.id}
          selected={node.selected}
          title={node.title}
          type={node.type}
          isOpen={expandedNodes.includes(`${node.type}-${node.id}`)}
          onPress={() => handleToggle(node)}
        >
          {node.children &&
            node.children.length > 0 &&
            renderTree(node.children)}
        </Collapsible>
      );
    });
  };

  return <View>{renderTree(nodeList)}</View>;
}

type CollapsibleProps = {
  key: string;
  selected?: Boolean;
  id: number;
  title: string;
  type?: string;
  children: React.ReactNode;
  isOpen: boolean;
  onPress: () => void;
};

export function Collapsible({
  selected,
  title,
  type,
  children,
  isOpen,
  onPress,
}: CollapsibleProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <TouchableOpacity
        onPress={onPress}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        {type === "device" ? (
          <>
            <ThemedText>⚡</ThemedText>
            <ThemedText style={{ color: "#ff822d" }}>{title}</ThemedText>
          </>
        ) : (
          <>
            <ThemedText>{isOpen ? "⬇️​" : "➡️​"}</ThemedText>
            <ThemedText
              style={{
                color: selected ? "#ff822d" : "#00a6ed",
                marginLeft: 5,
                fontWeight: "bold",
              }}
            >
              {title}
            </ThemedText>
          </>
        )}
      </TouchableOpacity>

      {isOpen && <View style={{ marginLeft: 20 }}>{children}</View>}
    </View>
  );
}
