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
  IconButton,
  List,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";
import {
  useAddPurchase,
  useDeleteItem,
  useDeletePurchase,
  useItem,
  useUpdatePurchase,
} from "@/lib/queries";
import type { ItemPurchase } from "@/lib/types";

export default function ItemDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading } = useItem(id);
  const addPurchase = useAddPurchase(id);
  const updatePurchase = useUpdatePurchase(id);
  const deletePurchase = useDeletePurchase(id);

  const removeItem = useDeleteItem();

  const [buyOpen, setBuyOpen] = useState(false);
  const [editing, setEditing] = useState<ItemPurchase | null>(null);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPurchaseDelete, setConfirmPurchaseDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const openAdd = () => {
    setEditing(null);
    setQty("");
    setCost("");
    setError("");
    setBuyOpen(true);
  };

  const openEdit = (purchase: ItemPurchase) => {
    setEditing(purchase);
    setQty(String(purchase.quantity));
    setCost(String(purchase.totalCost));
    setError("");
    setBuyOpen(true);
  };

  const submitPurchase = async () => {
    setError("");
    try {
      if (editing) {
        await updatePurchase.mutateAsync({
          purchaseId: editing.id,
          quantity: Number(qty) || 0,
          totalCost: Number(cost) || 0,
        });
      } else {
        await addPurchase.mutateAsync({
          quantity: Number(qty) || 0,
          totalCost: Number(cost) || 0,
        });
      }
      setBuyOpen(false);
    } catch (e) {
      setError(apiError(e));
    }
  };

  const removePurchase = async () => {
    if (!editing) return;
    setError("");
    try {
      await deletePurchase.mutateAsync(editing.id);
      setConfirmPurchaseDelete(false);
      setBuyOpen(false);
    } catch (e) {
      setConfirmPurchaseDelete(false);
      setError(apiError(e));
    }
  };

  const doDeleteItem = async () => {
    setDeleteError("");
    try {
      await removeItem.mutateAsync(item.id);
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      setDeleteError(apiError(e));
    }
  };

  const dialogBusy = addPurchase.isPending || updatePurchase.isPending || deletePurchase.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerRight: () => (
            <IconButton
              icon="delete-outline"
              onPress={() => {
                setDeleteError("");
                setConfirmDelete(true);
              }}
            />
          ),
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
              <Text variant="titleMedium" style={{ color: theme.colors.income }}>
                {taka(item.income)}
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">{item.profit >= 0 ? "লাভ" : "ক্ষতি"}</Text>
              <Text
                variant="titleMedium"
                style={{ color: item.profit >= 0 ? theme.colors.income : theme.colors.loss }}
              >
                {taka(Math.abs(item.profit))}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button mode="contained" icon="cart-plus" onPress={openAdd}>
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
                  right={(props) => <List.Icon {...props} icon="pencil-outline" />}
                  onPress={() => openEdit(p)}
                />
              </View>
            ))}
          </Card>
        ) : null}
        {error && !buyOpen ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
      </ScrollView>

      <Portal>
        <Dialog visible={buyOpen} onDismiss={() => setBuyOpen(false)}>
          <Dialog.Title>{editing ? "কেনার হিসাব সম্পাদনা" : "আবার কিনেছি"}</Dialog.Title>
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
            {error && buyOpen ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            {editing && (
              <Button
                textColor={theme.colors.error}
                onPress={() => setConfirmPurchaseDelete(true)}
                disabled={dialogBusy}
              >
                মুছুন
              </Button>
            )}
            <Button onPress={() => setBuyOpen(false)}>বাতিল</Button>
            <Button
              onPress={submitPurchase}
              loading={dialogBusy}
              disabled={(!qty && !cost) || dialogBusy}
            >
              {editing ? "সংরক্ষণ" : "যোগ করুন"}
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={confirmPurchaseDelete}
          onDismiss={() => setConfirmPurchaseDelete(false)}
        >
          <Dialog.Title>কেনার হিসাব মুছবেন?</Dialog.Title>
          <Dialog.Content>
            {editing && (
              <Text>
                {bn(editing.quantity)}টি — {taka(editing.totalCost)} কেনার হিসাবটি মুছে ফেলা হবে।
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmPurchaseDelete(false)}>বাতিল</Button>
            <Button
              textColor={theme.colors.error}
              onPress={removePurchase}
              loading={deletePurchase.isPending}
              disabled={deletePurchase.isPending}
            >
              মুছে ফেলুন
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>মুছে ফেলবেন?</Dialog.Title>
          <Dialog.Content>
            <Text>&ldquo;{item.name}&rdquo; মুছে ফেলা হবে।</Text>
            {deleteError ? <Text style={[styles.error, { color: theme.colors.error }]}>{deleteError}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>বাতিল</Button>
            <Button
              textColor={theme.colors.error}
              onPress={doDeleteItem}
              loading={removeItem.isPending}
              disabled={removeItem.isPending}
            >
              মুছে ফেলুন
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
  actions: { flexDirection: "row", gap: 12, justifyContent: "center", marginVertical: 8 },
  sectionTitle: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  empty: { opacity: 0.6, marginLeft: 4, marginBottom: 8 },
  error: { marginTop: 8 },
  dialogInput: { marginBottom: 12 },
});
