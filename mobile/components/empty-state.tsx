import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon as never}
        size={56}
        color={theme.colors.outline}
      />
      <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.outline }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  message: { marginTop: 12, textAlign: "center" },
});
