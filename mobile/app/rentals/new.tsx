import DateTimePicker from "@react-native-community/datetimepicker";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  List,
  Portal,
  RadioButton,
  Text,
  TextInput,
} from "react-native-paper";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useCreateRental, useItems, useRenters } from "@/lib/queries";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function NewRentalScreen() {
  const { data: renters } = useRenters();
  const { data: items } = useItems();
  const create = useCreateRental();

  const [renterId, setRenterId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<"renter" | "item" | null>(null);
  const [datePicker, setDatePicker] = useState<"start" | "return" | null>(null);

  const renter = renters?.find((r) => r.id === renterId);
  const item = items?.find((i) => i.id === itemId);

  const submit = async () => {
    setError("");
    try {
      await create.mutateAsync({
        renterId,
        itemId,
        quantity: Number(quantity),
        rate: rate === "" ? undefined : Number(rate),
        startDate: toDateOnly(startDate),
        expectedReturnDate: returnDate ? toDateOnly(returnDate) : null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const valid = renterId && itemId && Number(quantity) >= 1;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "নতুন ভাড়া",
          headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Button mode="outlined" icon="account" onPress={() => setPicker("renter")} style={styles.input}>
          {renter ? renter.name : "ভাড়াটিয়া বাছাই করুন"}
        </Button>
        <Button mode="outlined" icon="package-variant" onPress={() => setPicker("item")} style={styles.input}>
          {item
            ? `${item.name} (আছে ${bn(item.availableQuantity)}টি)`
            : "মালামাল বাছাই করুন"}
        </Button>
        <TextInput
          label="পরিমাণ"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          label={
            item
              ? `ভাড়ার হার (${taka(item.rate)} ${rateUnitLabel(item.rateUnit)})`
              : "ভাড়ার হার (ঐচ্ছিক)"
          }
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          placeholder={item ? String(item.rate) : ""}
          style={styles.input}
        />
        <View style={styles.dateRow}>
          <Button mode="outlined" icon="calendar" onPress={() => setDatePicker("start")} style={styles.dateButton}>
            {`শুরু: ${bnDate(startDate)}`}
          </Button>
          <Button mode="outlined" icon="calendar-check" onPress={() => setDatePicker("return")} style={styles.dateButton}>
            {returnDate ? `ফেরত: ${bnDate(returnDate)}` : "ফেরতের তারিখ (ঐচ্ছিক)"}
          </Button>
        </View>
        <TextInput label="নোট (ঐচ্ছিক)" value={notes} onChangeText={setNotes} multiline style={styles.input} />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button mode="contained" onPress={submit} loading={create.isPending} disabled={!valid || create.isPending}>
          ভাড়া দিন
        </Button>
      </ScrollView>

      {datePicker && (
        <DateTimePicker
          value={datePicker === "start" ? startDate : (returnDate ?? new Date())}
          mode="date"
          onChange={(event, date) => {
            setDatePicker(null);
            if (event.type === "set" && date) {
              if (datePicker === "start") setStartDate(date);
              else setReturnDate(date);
            }
          }}
        />
      )}

      <Portal>
        <Dialog visible={picker !== null} onDismiss={() => setPicker(null)}>
          <Dialog.Title>
            {picker === "renter" ? "ভাড়াটিয়া বাছাই করুন" : "মালামাল বাছাই করুন"}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView>
              {picker === "renter" &&
                (renters?.length ? (
                  renters.map((r) => (
                    <RadioButton.Item
                      key={r.id}
                      label={r.name}
                      value={r.id}
                      status={renterId === r.id ? "checked" : "unchecked"}
                      onPress={() => {
                        setRenterId(r.id);
                        setPicker(null);
                      }}
                    />
                  ))
                ) : (
                  <Text style={styles.dialogEmpty}>আগে ভাড়াটিয়া যোগ করুন</Text>
                ))}
              {picker === "item" &&
                (items?.length ? (
                  items.map((i) => (
                    <List.Item
                      key={i.id}
                      title={i.name}
                      description={`আছে ${bn(i.availableQuantity)}টি · ${taka(i.rate)} ${rateUnitLabel(i.rateUnit)}`}
                      onPress={() => {
                        setItemId(i.id);
                        setPicker(null);
                      }}
                      left={(p) => (
                        <List.Icon
                          {...p}
                          icon={itemId === i.id ? "radiobox-marked" : "radiobox-blank"}
                        />
                      )}
                    />
                  ))
                ) : (
                  <Text style={styles.dialogEmpty}>আগে মালামাল যোগ করুন</Text>
                ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setPicker(null)}>বন্ধ করুন</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  dateRow: { gap: 8, marginBottom: 12 },
  dateButton: {},
  dialogScroll: { maxHeight: 400, paddingHorizontal: 0 },
  dialogEmpty: { padding: 16, opacity: 0.6 },
});
