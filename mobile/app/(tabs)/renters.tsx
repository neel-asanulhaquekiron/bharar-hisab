import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function RentersScreen() {
  return (
    <View style={styles.container}>
      <Text variant="bodyLarge">ভাড়াটিয়ার তালিকা শীঘ্রই আসছে…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
