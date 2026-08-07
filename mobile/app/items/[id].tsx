import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  List,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useAddPurchase, useItem } from "@/lib/queries";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading } = useItem(id);
  const addPurchase = useAddPurchase(id);

  const [buyOpen, setBuyOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const submitPurchase = async () => {
    setError("");
    try {
      await addPurchase.mutateAsync({
        quantity: Number(qty) || 0,
        totalCost: Number(cost) || 0,
      });
      setBuyOpen(false);
      setQty("");
      setCost("");
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: item.name,
          headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Title
            title={item.name}
            subtitle={`${taka(item.rate)} ${rateUnitLabel(item.rateUnit)}`}
            titleStyle={styles.cardTitle}
          />
          <Card.Content>
            <View style={styles.chips}>
              <Chip compact icon="package-variant">{`মোট ${bn(item.totalQuantity)}টি`}</Chip>
              <Chip compact icon="arrow-up-bold">{`বাইরে ${bn(item.outQuantity)}টি`}</Chip>
              <Chip compact icon="check">{`আছে ${bn(item.availableQuantity)}টি`}</Chip>
            </View>
            {item.description ? (
              <Text variant="bodyMedium" style={styles.description}>
                {item.description}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.totalsRow}>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">মোট খরচ</Text>
              <Text variant="titleMedium">{taka(item.investment)}</Text>
            </View>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">মোট আয়</Text>
              <Text variant="titleMedium" style={styles.income}>
                {taka(item.income)}
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">{item.profit >= 0 ? "লাভ" : "ক্ষতি"}</Text>
              <Text
                variant="titleMedium"
                style={item.profit >= 0 ? styles.income : styles.loss}
              >
                {taka(Math.abs(item.profit))}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button mode="contained" icon="cart-plus" onPress={() => setBuyOpen(true)}>
            আবার কিনেছি
          </Button>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => router.push({ pathname: "/items/form", params: { id } })}
          >
            সম্পাদনা
          </Button>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          কেনার ইতিহাস
        </Text>
        {!item.purchases?.length && (
          <Text style={styles.empty}>এখনো কোনো কেনার হিসাব নেই</Text>
        )}
        {item.purchases?.length ? (
          <Card style={styles.card}>
            {item.purchases.map((p, index) => (
              <View key={p.id}>
                {index > 0 && <Divider />}
                <List.Item
                  title={`${bn(p.quantity)}টি — ${taka(p.totalCost)}`}
                  description={`${bnDate(p.purchasedAt)}${p.notes ? ` · ${p.notes}` : ""}`}
                  left={(props) => <List.Icon {...props} icon="cart" />}
                />
              </View>
            ))}
          </Card>
        ) : null}
        {error && !buyOpen ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <Portal>
        <Dialog visible={buyOpen} onDismiss={() => setBuyOpen(false)}>
          <Dialog.Title>আবার কিনেছি</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="কতটি কিনলেন?"
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              style={styles.dialogInput}
            />
            <TextInput
              label="মোট খরচ (৳)"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
            />
            {error && buyOpen ? <Text style={styles.error}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBuyOpen(false)}>বাতিল</Button>
            <Button
              onPress={submitPurchase}
              loading={addPurchase.isPending}
              disabled={(!qty && !cost) || addPurchase.isPending}
            >
              যোগ করুন
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 12, paddingBottom: 32 },
  card: { marginBottom: 10 },
  cardTitle: { fontFamily: "NotoSansBengali_500Medium" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  description: { marginTop: 8, opacity: 0.7 },
  totalsRow: { flexDirection: "row" },
  totalBox: { flex: 1, alignItems: "center" },
  income: { color: "#2e7d32" },
  loss: { color: "#c62828" },
  actions: { flexDirection: "row", gap: 12, justifyContent: "center", marginVertical: 8 },
  sectionTitle: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  empty: { opacity: 0.6, marginLeft: 4, marginBottom: 8 },
  error: { color: "#c62828", marginTop: 8 },
  dialogInput: { marginBottom: 12 },
});
