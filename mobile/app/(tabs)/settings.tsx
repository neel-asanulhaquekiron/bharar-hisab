import { StyleSheet, View } from "react-native";
import { Button, List, Text } from "react-native-paper";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={styles.container}>
      <List.Section>
        <List.Item
          title={user?.name ?? ""}
          description={user?.email ?? ""}
          left={(props) => <List.Icon {...props} icon="account-circle" />}
        />
      </List.Section>
      <Button mode="outlined" onPress={logout} icon="logout" style={styles.logout}>
        লগআউট
      </Button>
      <Text variant="bodySmall" style={styles.meta}>
        সার্ভার: {API_URL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  logout: { marginTop: 8 },
  meta: { marginTop: "auto", textAlign: "center", opacity: 0.5 },
});
