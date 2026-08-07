import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  HelperText,
  Menu,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { FormScreen } from "@/components/form-screen";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useCreateRental, useItems, useRenters, useSaveRenter } from "@/lib/queries";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const NEW_RENTER = "__new__";

export default function NewRentalScreen() {
  const { data: renters } = useRenters();
  const { data: items } = useItems();
  const create = useCreateRental();
  const saveRenter = useSaveRenter();

  const [itemId, setItemId] = useState("");
  const [renterChoice, setRenterChoice] = useState<string>(NEW_RENTER);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [advance, setAdvance] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState("ক্যাশ");
  const [error, setError] = useState("");
  const [itemMenu, setItemMenu] = useState(false);
  const [renterMenu, setRenterMenu] = useState(false);
  const [datePicker, setDatePicker] = useState<"start" | "return" | null>(null);

  const availableItems = (items ?? []).filter((i) => i.availableQuantity > 0);
  const item = items?.find((i) => i.id === itemId);
  const isNewRenter = renterChoice === NEW_RENTER;
  const renter = renters?.find((r) => r.id === renterChoice);

  const pickFromContacts = async () => {
    setError("");
    try {
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        if (contact.name) setNewName(contact.name);
        const phone = contact.phoneNumbers?.[0]?.number;
        if (phone) setNewPhone(phone.replace(/[\s-]/g, ""));
      }
    } catch (e) {
      setError(apiError(e));
    }
  };

  const submit = async () => {
    setError("");
    try {
      let renterId = renterChoice;
      if (isNewRenter) {
        const { renter: created } = await saveRenter.mutateAsync({
          name: newName.trim(),
          phone: newPhone.trim(),
        });
        renterId = created.id;
      }
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

  const renterValid = isNewRenter ? newName.trim() && newPhone.trim() : !!renter;
  const valid = itemId && renterValid && Number(quantity) >= 1;
  const busy = create.isPending || saveRenter.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "নতুন ভাড়া",
          headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        }}
      />
      <FormScreen contentStyle={styles.container}>
        <Menu
          visible={itemMenu}
          onDismiss={() => setItemMenu(false)}
          anchorPosition="bottom"
          anchor={
            <TouchableRipple onPress={() => setItemMenu(true)}>
              <View pointerEvents="none">
                <TextInput
                  label="মালামাল"
                  value={item ? `${item.name} (আছে ${bn(item.availableQuantity)}টি)` : ""}
                  editable={false}
                  right={<TextInput.Icon icon="menu-down" />}
                  style={styles.input}
                />
              </View>
            </TouchableRipple>
          }
        >
          {availableItems.length === 0 && (
            <Menu.Item title="কোনো মালামাল available নেই" disabled onPress={() => {}} />
          )}
          {availableItems.map((i) => (
            <Menu.Item
              key={i.id}
              title={`${i.name} — আছে ${bn(i.availableQuantity)}টি (${taka(i.rate)} ${rateUnitLabel(i.rateUnit)})`}
              onPress={() => {
                setItemId(i.id);
                setItemMenu(false);
              }}
            />
          ))}
        </Menu>

        <Menu
          visible={renterMenu}
          onDismiss={() => setRenterMenu(false)}
          anchorPosition="bottom"
          anchor={
            <TouchableRipple onPress={() => setRenterMenu(true)}>
              <View pointerEvents="none">
                <TextInput
                  label="ভাড়াটিয়া"
                  value={isNewRenter ? "নতুন ভাড়াটিয়া" : (renter?.name ?? "")}
                  editable={false}
                  right={<TextInput.Icon icon="menu-down" />}
                  style={styles.input}
                />
              </View>
            </TouchableRipple>
          }
        >
          <Menu.Item
            leadingIcon="account-plus"
            title="নতুন ভাড়াটিয়া"
            onPress={() => {
              setRenterChoice(NEW_RENTER);
              setRenterMenu(false);
            }}
          />
          {(renters ?? []).length > 0 && <Divider />}
          {(renters ?? []).map((r) => (
            <Menu.Item
              key={r.id}
              leadingIcon="account"
              title={r.phone ? `${r.name} (${bn(r.phone)})` : r.name}
              onPress={() => {
                setRenterChoice(r.id);
                setRenterMenu(false);
              }}
            />
          ))}
        </Menu>

        {isNewRenter && (
          <View style={styles.newRenterBox}>
            <TextInput
              label="ভাড়াটিয়ার নাম"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
            <TextInput
              label="ফোন নম্বর"
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <Button mode="text" icon="card-account-phone" onPress={pickFromContacts} compact>
              কন্টাক্ট থেকে আনুন
            </Button>
          </View>
        )}

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
        <TextInput
          label="নোট (ঐচ্ছিক)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.input}
        />

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
        <Button mode="contained" onPress={submit} loading={busy} disabled={!valid || busy}>
          ভাড়া দিন
        </Button>
      </FormScreen>

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
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  input: { marginBottom: 12 },
  newRenterBox: { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#00695C", marginBottom: 8 },
  dateRow: { gap: 8, marginBottom: 12 },
  advanceTitle: { marginBottom: 8, marginTop: 4 },
});
