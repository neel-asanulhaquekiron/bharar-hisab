import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts";
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
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useCreateRental, useItems, useRenters, useSaveRenter } from "@/lib/queries";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function NewRentalScreen() {
  const { data: renters } = useRenters();
  const { data: items } = useItems();
  const create = useCreateRental();
  const saveRenter = useSaveRenter();

  const [renterId, setRenterId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [advance, setAdvance] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState("ক্যাশ");
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<"renter" | "item" | null>(null);
  const [datePicker, setDatePicker] = useState<"start" | "return" | null>(null);

  // inline "new renter" mini-form inside the picker dialog
  const [addingRenter, setAddingRenter] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [renterError, setRenterError] = useState("");

  const renter = renters?.find((r) => r.id === renterId);
  const item = items?.find((i) => i.id === itemId);

  const closePicker = () => {
    setPicker(null);
    setAddingRenter(false);
    setRenterError("");
  };

  const pickFromContacts = async () => {
    setRenterError("");
    try {
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        if (contact.name) setNewName(contact.name);
        const phone = contact.phoneNumbers?.[0]?.number;
        if (phone) setNewPhone(phone.replace(/[\s-]/g, ""));
      }
    } catch (e) {
      setRenterError(apiError(e));
    }
  };

  const saveNewRenter = async () => {
    setRenterError("");
    try {
      const { renter: created } = await saveRenter.mutateAsync({
        name: newName.trim(),
        phone: newPhone.trim() || null,
      });
      setRenterId(created.id);
      setNewName("");
      setNewPhone("");
      closePicker();
    } catch (e) {
      setRenterError(apiError(e));
    }
  };

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
        ...(Number(advance) > 0
          ? { advanceAmount: Number(advance), advanceMethod }
          : {}),
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
          <Button mode="outlined" icon="calendar" onPress={() => setDatePicker("start")}>
            {`শুরু: ${bnDate(startDate)}`}
          </Button>
          <Button mode="outlined" icon="calendar-check" onPress={() => setDatePicker("return")}>
            {returnDate ? `ফেরত: ${bnDate(returnDate)}` : "ফেরতের তারিখ (ঐচ্ছিক)"}
          </Button>
        </View>
        <TextInput label="নোট (ঐচ্ছিক)" value={notes} onChangeText={setNotes} multiline style={styles.input} />

        <Text variant="titleSmall" style={styles.advanceTitle}>
          অগ্রিম জমা (ঐচ্ছিক)
        </Text>
        <TextInput
          label="অগ্রিম টাকার পরিমাণ (৳)"
          value={advance}
          onChangeText={setAdvance}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        {Number(advance) > 0 && (
          <SegmentedButtons
            value={advanceMethod}
            onValueChange={setAdvanceMethod}
            buttons={[
              { value: "ক্যাশ", label: "ক্যাশ" },
              { value: "নগদ", label: "নগদ" },
              { value: "বিকাশ", label: "বিকাশ" },
            ]}
            style={styles.input}
          />
        )}

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
        <Dialog visible={picker !== null} onDismiss={closePicker}>
          <Dialog.Title>
            {picker === "item"
              ? "মালামাল বাছাই করুন"
              : addingRenter
                ? "নতুন ভাড়াটিয়া"
                : "ভাড়াটিয়া বাছাই করুন"}
          </Dialog.Title>

          {picker === "renter" && addingRenter ? (
            <Dialog.Content>
              <Button
                mode="outlined"
                icon="card-account-phone"
                onPress={pickFromContacts}
                style={styles.input}
              >
                কন্টাক্ট থেকে আনুন
              </Button>
              <TextInput
                label="নাম"
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
              />
              <TextInput
                label="ফোন (ঐচ্ছিক)"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              {renterError ? <Text style={styles.error}>{renterError}</Text> : null}
            </Dialog.Content>
          ) : (
            <Dialog.ScrollArea style={styles.dialogScroll}>
              <ScrollView>
                {picker === "renter" &&
                  (renters?.length ? (
                    renters.map((r) => (
                      <RadioButton.Item
                        key={r.id}
                        label={r.phone ? `${r.name} (${bn(r.phone)})` : r.name}
                        value={r.id}
                        status={renterId === r.id ? "checked" : "unchecked"}
                        onPress={() => {
                          setRenterId(r.id);
                          closePicker();
                        }}
                      />
                    ))
                  ) : (
                    <Text style={styles.dialogEmpty}>
                      কোনো ভাড়াটিয়া নেই — নিচের বাটনে চাপ দিয়ে যোগ করুন
                    </Text>
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
                          closePicker();
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
          )}

          <Dialog.Actions>
            {picker === "renter" && !addingRenter && (
              <Button icon="account-plus" onPress={() => setAddingRenter(true)}>
                নতুন ভাড়াটিয়া
              </Button>
            )}
            {picker === "renter" && addingRenter && (
              <>
                <Button onPress={() => setAddingRenter(false)}>পেছনে</Button>
                <Button
                  onPress={saveNewRenter}
                  loading={saveRenter.isPending}
                  disabled={!newName.trim() || saveRenter.isPending}
                >
                  সংরক্ষণ
                </Button>
              </>
            )}
            {(picker === "item" || (picker === "renter" && !addingRenter)) && (
              <Button onPress={closePicker}>বন্ধ করুন</Button>
            )}
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
  advanceTitle: { marginBottom: 8, marginTop: 4 },
  dialogScroll: { maxHeight: 400, paddingHorizontal: 0 },
  dialogEmpty: { padding: 16, opacity: 0.6 },
  error: { color: "#c62828", marginTop: 8 },
});
