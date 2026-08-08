import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  HelperText,
  Menu,
  Portal,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { FormScreen } from "@/components/form-screen";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useCreateRental, useItems, useRenters, useSaveRenter } from "@/lib/queries";
import { useAppTheme } from "@/lib/theme";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normPhone(p: string): string {
  return p.replace(/\D/g, "");
}

function samePhone(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.length >= 10 && b.length >= 10) return a.slice(-10) === b.slice(-10);
  return a === b;
}

export default function NewRentalScreen() {
  const theme = useAppTheme();
  const { data: renters } = useRenters();
  const { data: items } = useItems();
  const create = useCreateRental();
  const saveRenter = useSaveRenter();

  const [itemId, setItemId] = useState("");
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
  const [toast, setToast] = useState("");
  const [itemMenu, setItemMenu] = useState(false);
  const [datePicker, setDatePicker] = useState<"start" | "return" | null>(null);

  const availableItems = (items ?? []).filter((i) => i.availableQuantity > 0);
  const item = items?.find((i) => i.id === itemId);

  // পুরানো ভাড়াটিয়া কিনা সিস্টেম নিজেই বের করে — আগে ফোন নম্বর, পরে নাম মিলিয়ে
  const matched =
    (renters ?? []).find((r) =>
      samePhone(normPhone(r.phone ?? ""), normPhone(newPhone)),
    ) ??
    (newName.trim()
      ? (renters ?? []).find(
          (r) => r.name.trim().toLowerCase() === newName.trim().toLowerCase(),
        )
      : undefined);

  // নাম অটো-ফিল হয়েছিল কিনা মনে রাখি — ব্যবহারকারীর নিজের লেখা নাম কখনো মুছি না
  const autoFilledName = useRef("");

  const findByPhone = (p: string) =>
    (renters ?? []).find((r) => samePhone(normPhone(r.phone ?? ""), normPhone(p)));

  // ফোন নম্বর বদলালে: পুরানো ভাড়াটিয়া মিললে নাম বসাই, মিল চলে গেলে অটো-ফিল নাম মুছি
  const applyPhone = (p: string) => {
    setNewPhone(p);
    const m = findByPhone(p);
    if (m && (!newName.trim() || newName === autoFilledName.current)) {
      setNewName(m.name);
      autoFilledName.current = m.name;
    } else if (!m && newName === autoFilledName.current) {
      setNewName("");
      autoFilledName.current = "";
    }
  };

  const pickFromContacts = async () => {
    setError("");
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setError("কন্টাক্ট দেখার অনুমতি দেওয়া হয়নি");
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        const phone = contact.phoneNumbers?.[0]?.number?.replace(/[\s-]/g, "") ?? "";
        const m = phone ? findByPhone(phone) : undefined;
        if (m) {
          setNewName(m.name);
          autoFilledName.current = m.name;
        } else if (contact.name) {
          setNewName(contact.name);
          autoFilledName.current = "";
        }
        if (phone) setNewPhone(phone);
      }
    } catch (e) {
      setError(apiError(e));
    }
  };

  const submit = async () => {
    setError("");
    const qty = Number(quantity);
    let missing = "";
    if (!itemId) missing = "মালামাল নির্বাচন করুন";
    else if (!matched && !newName.trim()) missing = "ভাড়াটিয়ার নাম লিখুন";
    else if (!matched && !newPhone.trim()) missing = "ফোন নম্বর লিখুন";
    else if (!quantity || qty < 1) missing = "কতটি ভাড়া দিচ্ছেন তা লিখুন";
    else if (item && qty > item.availableQuantity)
      missing = `"${item.name}" আছে মাত্র ${bn(item.availableQuantity)}টি`;
    if (missing) {
      setToast(missing);
      return;
    }
    try {
      let renterId = matched?.id ?? "";
      if (!renterId) {
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

  const busy = create.isPending || saveRenter.isPending;

  return (
    <>
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

        <TextInput
          label="ফোন নম্বর"
          value={newPhone}
          onChangeText={applyPhone}
          keyboardType="phone-pad"
          right={
            <TextInput.Icon
              icon="card-account-phone"
              forceTextInputFocus={false}
              onPress={pickFromContacts}
            />
          }
          style={(newName.trim() || newPhone.trim()) ? styles.inputTight : styles.input}
        />
        {(newName.trim() || newPhone.trim()) ? (
          <Text
            variant="bodySmall"
            style={[
              styles.renterHint,
              { color: matched ? theme.colors.primary : theme.colors.onSurfaceVariant },
            ]}
          >
            {matched
              ? `পুরানো ভাড়াটিয়া: ${matched.name}${matched.phone ? ` (${bn(matched.phone)})` : ""}`
              : "নতুন ভাড়াটিয়া হিসেবে যোগ হবে"}
          </Text>
        ) : null}
        <TextInput
          label="ভাড়াটিয়ার নাম"
          value={newName}
          onChangeText={setNewName}
          style={styles.input}
        />

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
        <Button mode="contained" onPress={submit} loading={busy} disabled={busy}>
          ভাড়া দিন
        </Button>
      </FormScreen>

      <Portal>
        <Snackbar visible={!!toast} onDismiss={() => setToast("")} duration={2500}>
          {toast}
        </Snackbar>
      </Portal>

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
  inputTight: { marginBottom: 2 },
  renterHint: { marginBottom: 12, marginLeft: 4 },
  dateRow: { gap: 8, marginBottom: 12 },
  advanceTitle: { marginBottom: 8, marginTop: 4 },
});
