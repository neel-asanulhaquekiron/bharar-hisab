import { useLocalSearchParams } from "expo-router";
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
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, statusLabel, taka } from "@/lib/format";
import { useCreatePayment, useDeletePayment, useRental, useReturnRental } from "@/lib/queries";
import { useAppTheme } from "@/lib/theme";

export default function RentalDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rental, isLoading } = useRental(id);
  const doReturn = useReturnRental(id);
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQty, setReturnQty] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("ক্যাশ");
  const [error, setError] = useState("");

  if (isLoading || !rental) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const remaining = rental.quantity - rental.returnedQuantity;
  const fin = rental.financials;

  const submitReturn = async () => {
    setError("");
    try {
      await doReturn.mutateAsync(Number(returnQty));
      setReturnOpen(false);
      setReturnQty("");
    } catch (e) {
      setError(apiError(e));
    }
  };

  const submitPayment = async () => {
    setError("");
    try {
      await createPayment.mutateAsync({
        rentalId: rental.id,
        amount: Number(amount),
        method,
      });
      setPayOpen(false);
      setAmount("");
      setMethod("ক্যাশ");
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Title
            title={`${rental.item.name} — ${bn(rental.quantity)}টি`}
            subtitle={rental.renter.name}
            titleStyle={styles.cardTitle}
            right={() => (
              <Chip compact style={styles.chip}>
                {statusLabel(rental.status)}
              </Chip>
            )}
          />
          <Card.Content>
            <Text variant="bodyMedium">
              হার: {taka(rental.rate)} {rateUnitLabel(rental.rateUnit)} ·{" "}
              {bn(fin.periods)} {rental.rateUnit === "DAILY" ? "দিন" : "মাস"}
            </Text>
            <Text variant="bodyMedium">শুরু: {bnDate(rental.startDate)}</Text>
            {rental.expectedReturnDate && (
              <Text variant="bodyMedium">
                ফেরতের কথা: {bnDate(rental.expectedReturnDate)}
              </Text>
            )}
            {rental.closedAt && (
              <Text variant="bodyMedium">ফেরত সম্পন্ন: {bnDate(rental.closedAt)}</Text>
            )}
            {rental.returnedQuantity > 0 && rental.status !== "RETURNED" && (
              <Text variant="bodyMedium">
                ফেরত হয়েছে: {bn(rental.returnedQuantity)}টি, বাকি {bn(remaining)}টি
              </Text>
            )}
            {rental.notes && <Text variant="bodyMedium">নোট: {rental.notes}</Text>}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.totalsRow}>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">মোট ভাড়া</Text>
              <Text variant="titleMedium">{taka(fin.charge)}</Text>
            </View>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">জমা</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.income }}>
                {taka(fin.paid)}
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text variant="labelMedium">বাকি</Text>
              <Text variant="titleMedium" style={{ color: fin.due > 0 ? theme.colors.loss : theme.colors.income }}>
                {taka(fin.due)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          {rental.status !== "RETURNED" && (
            <Button mode="contained-tonal" icon="package-down" onPress={() => setReturnOpen(true)}>
              ফেরত নিন
            </Button>
          )}
          <Button mode="contained" icon="cash-plus" onPress={() => setPayOpen(true)}>
            টাকা জমা
          </Button>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          পেমেন্টের ইতিহাস
        </Text>
        {rental.payments.length === 0 && (
          <Text style={styles.empty}>এখনো কোনো পেমেন্ট নেই</Text>
        )}
        <Card style={styles.card}>
          {rental.payments.map((p, index) => (
            <View key={p.id}>
              {index > 0 && <Divider />}
              <List.Item
                title={taka(p.amount)}
                description={`${bnDate(p.paidAt)}${p.method ? ` · ${p.method}` : ""}`}
                right={(props) => (
                  <IconButton
                    {...props}
                    icon="delete-outline"
                    onPress={() => deletePayment.mutate(p.id)}
                  />
                )}
              />
            </View>
          ))}
        </Card>
        {error && !returnOpen && !payOpen ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
      </ScrollView>

      <Portal>
        <Dialog visible={returnOpen} onDismiss={() => setReturnOpen(false)}>
          <Dialog.Title>মালামাল ফেরত</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>{`বাকি আছে ${bn(remaining)}টি`}</Text>
            <TextInput
              label="কতটি ফেরত নিচ্ছেন?"
              value={returnQty}
              onChangeText={setReturnQty}
              keyboardType="number-pad"
              style={styles.dialogInput}
            />
            <Button
              mode="outlined"
              icon="package-variant-closed-check"
              compact
              onPress={() => setReturnQty(String(remaining))}
            >
              পুরোটা ফেরত নিন ({bn(remaining)}টি)
            </Button>
            {error && returnOpen ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReturnOpen(false)}>বাতিল</Button>
            <Button
              onPress={submitReturn}
              loading={doReturn.isPending}
              disabled={!returnQty || Number(returnQty) < 1}
            >
              ফেরত নিন
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={payOpen} onDismiss={() => setPayOpen(false)}>
          <Dialog.Title>টাকা জমা</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>{`বাকি ${taka(fin.due)}`}</Text>
            <TextInput
              label="পরিমাণ (৳)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.dialogInput}
            />
            {fin.due > 0 && (
              <Button
                mode="outlined"
                icon="cash-check"
                compact
                onPress={() => setAmount(String(fin.due))}
                style={styles.dialogInput}
              >
                পুরো বাকি জমা করুন ({taka(fin.due)})
              </Button>
            )}
            <Text variant="labelMedium" style={styles.methodLabel}>
              মাধ্যম
            </Text>
            <SegmentedButtons
              value={method}
              onValueChange={setMethod}
              buttons={[
                { value: "ক্যাশ", label: "ক্যাশ" },
                { value: "নগদ", label: "নগদ" },
                { value: "বিকাশ", label: "বিকাশ" },
              ]}
            />
            {error && payOpen ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPayOpen(false)}>বাতিল</Button>
            <Button
              onPress={submitPayment}
              loading={createPayment.isPending}
              disabled={!amount || Number(amount) <= 0}
            >
              জমা করুন
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
  chip: { marginRight: 12 },
  totalsRow: { flexDirection: "row" },
  totalBox: { flex: 1, alignItems: "center" },
  actions: { flexDirection: "row", gap: 12, justifyContent: "center", marginVertical: 8 },
  sectionTitle: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  empty: { opacity: 0.6, marginLeft: 4, marginBottom: 8 },
  error: { marginTop: 8 },
  dialogHint: { marginBottom: 12, opacity: 0.7 },
  dialogInput: { marginBottom: 12 },
  methodLabel: { marginBottom: 6, opacity: 0.7 },
});
