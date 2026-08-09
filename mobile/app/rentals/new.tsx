import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import {
  Button,
  Chip,
  HelperText,
  Icon,
  Portal,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { FormScreen } from "@/components/form-screen";
import { apiError } from "@/lib/api";
import { bn, bnDate, rateUnitLabel, taka } from "@/lib/format";
import { useCreateRental, useItems, useRenters, useSaveRenter } from "@/lib/queries";
import { useAppTheme } from "@/lib/theme";
import type { Item, RateUnit } from "@/lib/types";

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

// সার্ভারের billingPeriods-এর হুবহু কপি — শুরু হওয়া প্রতিটি দিন/মাস গোনা হয়
// FLAT হলে যতদিনই থাকুক, এক দাম
function billingPeriods(start: Date, end: Date, unit: RateUnit): number {
  if (unit === "FLAT") return 1;
  if (end <= start) return 1;
  if (unit === "DAILY") {
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  }
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() > start.getDate()) months += 1;
  return Math.max(1, months);
}

const STEP_TITLES = [
  "কী ভাড়া দিচ্ছেন?",
  "কাকে ভাড়া দিচ্ছেন?",
  "কত, কবে থেকে?",
  "হিসাব মিলিয়ে নিন",
];
const TOTAL_STEPS = STEP_TITLES.length;

export default function NewRentalScreen() {
  const theme = useAppTheme();
  const { data: renters } = useRenters();
  const { data: items } = useItems();
  const create = useCreateRental();
  const saveRenter = useSaveRenter();

  const [step, setStep] = useState(0);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, string>>({});
  // ভাড়ার হিসাব (দৈনিক/মাসিক/এককালীন): সাধারণত এক ধরনই সবার জন্য (sharedUnit),
  // দরকার হলে "প্রতিটির জন্য আলাদা" মোডে মালামাল-প্রতি আলাদা ধরন
  const [units, setUnits] = useState<Record<string, RateUnit>>({});
  const [sharedUnit, setSharedUnit] = useState<RateUnit | null>(null);
  const [perItemMode, setPerItemMode] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [advance, setAdvance] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState("ক্যাশ");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [datePicker, setDatePicker] = useState<"start" | "return" | null>(null);

  const availableItems = (items ?? []).filter((i) => i.availableQuantity > 0);
  const selectedItems = itemIds
    .map((id) => items?.find((i) => i.id === id))
    .filter((i): i is Item => !!i);

  const findByPhone = (p: string) =>
    (renters ?? []).find((r) => samePhone(normPhone(r.phone ?? ""), normPhone(p)));

  // পুরানো ভাড়াটিয়া কিনা সিস্টেম নিজেই বের করে — আগে ফোন নম্বর, পরে নাম মিলিয়ে
  const phoneMatch = findByPhone(newPhone);
  const matched =
    phoneMatch ??
    (newName.trim()
      ? (renters ?? []).find(
          (r) => r.name.trim().toLowerCase() === newName.trim().toLowerCase(),
        )
      : undefined);

  // নাম অটো-ফিল হয়েছিল কিনা মনে রাখি — ব্যবহারকারীর নিজের লেখা নাম মুছি না
  const autoFilledName = useRef("");

  const applyPhone = (p: string) => {
    setNewPhone(p);
    const m = findByPhone(p);
    if (m) {
      setNewName(m.name);
      autoFilledName.current = m.name;
    } else if (newName === autoFilledName.current) {
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

  // ওপরের প্রগ্রেস বার — ধাপ বদলালে মসৃণভাবে এগোয়
  const progress = useSharedValue(1 / TOTAL_STEPS);
  useEffect(() => {
    progress.value = withTiming((step + 1) / TOTAL_STEPS, { duration: 250 });
  }, [step, progress]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const goTo = (s: number) => {
    Keyboard.dismiss();
    setStep(s);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleItem = (id: string) => {
    Haptics.selectionAsync();
    setItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // কোন ধাপে কী বাকি — সাবমিট বোতাম কখনো নিঃশব্দে disabled থাকে না
  const stepMissing = (s: number): string => {
    if (s === 0 && selectedItems.length === 0) return "মালামাল নির্বাচন করুন";
    if (s === 1) {
      if (!matched && !newPhone.trim()) return "ফোন নম্বর লিখুন";
      if (!matched && !newName.trim()) return "ভাড়াটিয়ার নাম লিখুন";
    }
    if (s === 2) {
      for (const it of selectedItems) {
        const qty = Number(quantities[it.id]);
        if (!quantities[it.id] || qty < 1)
          return selectedItems.length > 1
            ? `"${it.name}" কতটি ভাড়া দিচ্ছেন তা লিখুন`
            : "কতটি ভাড়া দিচ্ছেন তা লিখুন";
        if (qty > it.availableQuantity)
          return `"${it.name}" আছে মাত্র ${bn(it.availableQuantity)}টি`;
      }
    }
    return "";
  };

  const next = () => {
    const missing = stepMissing(step);
    if (missing) {
      setToast(missing);
      return;
    }
    goTo(step + 1);
  };

  const unitOf = (it: Item): RateUnit =>
    perItemMode ? (units[it.id] ?? it.rateUnit) : (sharedUnit ?? it.rateUnit);

  // হিসাবের প্রিভিউ — সার্ভার যেভাবে গুনবে সেভাবেই, প্রতিটি মালামাল আলাদা ভাড়া হয়
  const previews = selectedItems.map((it) => {
    const qty = Number(quantities[it.id]) || 0;
    const rate =
      rates[it.id] === undefined || rates[it.id] === ""
        ? Number(it.rate)
        : Number(rates[it.id]) || 0;
    const unit = unitOf(it);
    const periods = returnDate ? billingPeriods(startDate, returnDate, unit) : 1;
    return { item: it, unit, qty, rate, periods, total: qty * rate * periods };
  });
  const grandTotal = previews.reduce((sum, p) => sum + p.total, 0);
  const previewAdvance = Number(advance) || 0;
  // ফেরতের তারিখ না থাকলে টোটালটা "প্রতি দিন/মাস" হিসেবে — সব মালামালের একক এক হলে তবেই লেবেল দেখাই
  // এককালীন হলে দামটা এমনিতেই পুরোটা, কোনো লেবেল লাগে না
  const sameUnit =
    previews.length > 0 && previews.every((p) => p.unit === previews[0].unit);
  const grandUnitSuffix =
    !returnDate && sameUnit && previews[0]?.unit !== "FLAT"
      ? ` ${rateUnitLabel(previews[0].unit)}`
      : "";

  // অগ্রিম ভাগ হয় প্রতিটি ভাড়ার মোট অনুপাতে — শেষ ভগ্নাংশ প্রথমটায়
  const advanceShares = (): number[] => {
    if (previewAdvance <= 0 || previews.length === 0) return previews.map(() => 0);
    if (grandTotal <= 0) {
      return previews.map((_, i) => (i === 0 ? previewAdvance : 0));
    }
    const shares = previews.map((p) => Math.floor((previewAdvance * p.total) / grandTotal));
    shares[0] += previewAdvance - shares.reduce((a, b) => a + b, 0);
    return shares;
  };

  const submit = async () => {
    setError("");
    for (let s = 0; s < TOTAL_STEPS; s++) {
      const missing = stepMissing(s);
      if (missing) {
        setToast(missing);
        goTo(s);
        return;
      }
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
      const shares = advanceShares();
      for (let i = 0; i < previews.length; i++) {
        const p = previews[i];
        await create.mutateAsync({
          renterId,
          itemId: p.item.id,
          quantity: p.qty,
          rate:
            rates[p.item.id] === undefined || rates[p.item.id] === ""
              ? undefined
              : Number(rates[p.item.id]),
          rateUnit: p.unit,
          startDate: toDateOnly(startDate),
          expectedReturnDate: returnDate ? toDateOnly(returnDate) : null,
          notes: notes.trim() || null,
          ...(shares[i] > 0 ? { advanceAmount: shares[i], advanceMethod } : {}),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/rentals");
    } catch (e) {
      setError(apiError(e));
    }
  };

  const busy = create.isPending || saveRenter.isPending;

  const renterLabel = matched?.name ?? newName.trim();
  const totalQty = previews.reduce((sum, p) => sum + p.qty, 0);
  const itemChipLabel =
    selectedItems.length > 1
      ? `${selectedItems[0].name} +${bn(selectedItems.length - 1)}`
      : selectedItems[0]?.name;

  return (
    <>
      <FormScreen contentStyle={styles.container}>
        {/* প্রগ্রেস + ধাপের শিরোনাম */}
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Animated.View
            style={[styles.fill, { backgroundColor: theme.colors.primary }, progressStyle]}
          />
        </View>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {`ধাপ ${bn(step + 1)} / ${bn(TOTAL_STEPS)}`}
        </Text>
        <Text variant="headlineSmall" style={styles.stepTitle}>
          {STEP_TITLES[step]}
        </Text>

        {/* আগের ধাপে যা বাছাই হয়েছে — চিপে ট্যাপ করলে সেই ধাপে ফেরা যায় */}
        {step > 0 && (
          <View style={styles.recapRow}>
            {!!itemChipLabel && (
              <Chip compact icon="package-variant" onPress={() => goTo(0)}>
                {itemChipLabel}
              </Chip>
            )}
            {step > 1 && !!renterLabel && (
              <Chip compact icon="account" onPress={() => goTo(1)}>
                {renterLabel}
              </Chip>
            )}
            {step > 2 && totalQty > 0 && (
              <Chip compact icon="counter" onPress={() => goTo(2)}>
                {`${bn(totalQty)}টি`}
              </Chip>
            )}
          </View>
        )}

        <Animated.View key={step} entering={FadeIn.duration(180)}>
          {step === 0 && (
            <View style={styles.cardList}>
              {availableItems.length === 0 && (
                <View style={styles.emptyBox}>
                  <Icon source="package-variant-closed" size={40} />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    ভাড়া দেওয়ার মতো কোনো মালামাল নেই
                  </Text>
                  <Button mode="contained-tonal" onPress={() => router.push("/items/form")}>
                    মালামাল যোগ করুন
                  </Button>
                </View>
              )}
              {availableItems.length > 0 && (
                <Text
                  variant="bodySmall"
                  style={[styles.multiHint, { color: theme.colors.onSurfaceVariant }]}
                >
                  একসাথে একাধিক মালামালও বাছাই করা যায়
                </Text>
              )}
              {availableItems.map((i) => {
                const selected = itemIds.includes(i.id);
                return (
                  <TouchableRipple
                    key={i.id}
                    borderless
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                      },
                    ]}
                    onPress={() => toggleItem(i.id)}
                  >
                    <View style={styles.itemCardInner}>
                      <Icon
                        source={selected ? "check-circle" : "package-variant"}
                        size={28}
                        color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                      <View style={styles.itemCardText}>
                        <Text variant="titleMedium">{i.name}</Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {`আছে ${bn(i.availableQuantity)}টি • ${taka(i.rate)} ${rateUnitLabel(i.rateUnit)}`}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                );
              })}
            </View>
          )}

          {step === 1 && (
            <View>
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
                style={styles.inputTight}
              />
              {/* হিন্টের জায়গা সবসময় ধরা থাকে — লেখার সময় নিচের ফিল্ড নড়ে না */}
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={[
                  styles.renterHint,
                  { color: matched ? theme.colors.primary : theme.colors.onSurfaceVariant },
                ]}
              >
                {newName.trim() || newPhone.trim()
                  ? matched
                    ? `পুরানো ভাড়াটিয়া: ${matched.name}${matched.phone ? ` (${bn(matched.phone)})` : ""}`
                    : "নতুন ভাড়াটিয়া হিসেবে যোগ হবে"
                  : " "}
              </Text>
              <TextInput
                label="ভাড়াটিয়ার নাম"
                value={newName}
                onChangeText={setNewName}
                disabled={!!phoneMatch}
                style={styles.input}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              {/* ভাড়ার ধরন: এক কন্ট্রোলেই সবগুলোর জন্য — দরকার হলে মালামাল-প্রতি আলাদা */}
              <View style={styles.masterUnitHeader}>
                <Text
                  variant="labelMedium"
                  style={[styles.masterUnitLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  {perItemMode ? "ভাড়ার ধরন — প্রতিটির আলাদা" : "ভাড়ার ধরন"}
                </Text>
                {selectedItems.length > 1 && (
                  <Button
                    compact
                    mode="text"
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (perItemMode) {
                        setSharedUnit(unitOf(selectedItems[0]));
                        setPerItemMode(false);
                      } else {
                        setUnits((prev) => ({
                          ...prev,
                          ...Object.fromEntries(
                            selectedItems.map((it) => [it.id, unitOf(it)]),
                          ),
                        }));
                        setPerItemMode(true);
                      }
                    }}
                  >
                    {perItemMode ? "সবগুলোর এক ধরন" : "প্রতিটির জন্য আলাদা"}
                  </Button>
                )}
              </View>
              {!perItemMode && (
                <SegmentedButtons
                  value={
                    sharedUnit ??
                    (selectedItems.length > 0 &&
                    selectedItems.every((it) => it.rateUnit === selectedItems[0].rateUnit)
                      ? selectedItems[0].rateUnit
                      : "")
                  }
                  onValueChange={(v) => {
                    Haptics.selectionAsync();
                    setSharedUnit(v as RateUnit);
                  }}
                  buttons={[
                    { value: "DAILY", label: "দৈনিক" },
                    { value: "MONTHLY", label: "মাসিক" },
                    { value: "FLAT", label: "এককালীন" },
                  ]}
                  style={styles.unitRow}
                />
              )}
              {selectedItems.map((it) => (
                <View key={it.id}>
                  {selectedItems.length > 1 && (
                    <Text variant="titleSmall" style={styles.itemHeader}>
                      {`${it.name} (আছে ${bn(it.availableQuantity)}টি)`}
                    </Text>
                  )}
                  {/* মালামাল-প্রতি আলাদা ধরন — শুধু "প্রতিটির জন্য আলাদা" মোডে */}
                  {perItemMode && (
                    <SegmentedButtons
                      value={unitOf(it)}
                      onValueChange={(v) => {
                        Haptics.selectionAsync();
                        setUnits((prev) => ({ ...prev, [it.id]: v as RateUnit }));
                      }}
                      buttons={[
                        { value: "DAILY", label: "দৈনিক" },
                        { value: "MONTHLY", label: "মাসিক" },
                        { value: "FLAT", label: "এককালীন" },
                      ]}
                      style={styles.unitRow}
                    />
                  )}
                  <View style={styles.qtyRow}>
                    <TextInput
                      label={
                        selectedItems.length > 1
                          ? "পরিমাণ"
                          : `পরিমাণ (আছে ${bn(it.availableQuantity)}টি)`
                      }
                      value={quantities[it.id] ?? ""}
                      onChangeText={(v) =>
                        setQuantities((prev) => ({ ...prev, [it.id]: v }))
                      }
                      keyboardType="number-pad"
                      style={styles.qtyInput}
                    />
                    <TextInput
                      label={
                        unitOf(it) === "FLAT"
                          ? "দাম (৳ প্রতিটি)"
                          : `হার (${taka(it.rate)} ${rateUnitLabel(it.rateUnit)})`
                      }
                      value={rates[it.id] ?? ""}
                      onChangeText={(v) => setRates((prev) => ({ ...prev, [it.id]: v }))}
                      keyboardType="decimal-pad"
                      placeholder={String(it.rate)}
                      style={styles.qtyInput}
                    />
                  </View>
                </View>
              ))}
              <View style={styles.dateRow}>
                <Button mode="outlined" icon="calendar" onPress={() => setDatePicker("start")}>
                  {`শুরু: ${bnDate(startDate)}`}
                </Button>
                <Button
                  mode="outlined"
                  icon="calendar-check"
                  onPress={() => setDatePicker("return")}
                >
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
            </View>
          )}

          {step === 3 && (
            <View>
              <TextInput
                label="অগ্রিম টাকার পরিমাণ (৳) — ঐচ্ছিক"
                value={advance}
                onChangeText={setAdvance}
                keyboardType="decimal-pad"
                style={styles.input}
              />
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

              {grandTotal > 0 ? (
                <View
                  style={[styles.summary, { backgroundColor: theme.colors.surfaceVariant }]}
                >
                  {previews.map((p) => (
                    <View key={p.item.id} style={styles.summaryRow}>
                      <Text variant="bodyMedium" style={styles.summaryLabel}>
                        {`${p.item.name} (${bn(p.qty)}টি × ${taka(p.rate)}${
                          returnDate && p.unit !== "FLAT"
                            ? ` × ${bn(p.periods)} ${p.unit === "MONTHLY" ? "মাস" : "দিন"}`
                            : ""
                        })`}
                      </Text>
                      <Text variant="bodyMedium">
                        {returnDate || p.unit === "FLAT"
                          ? taka(p.total)
                          : `${taka(p.total)} ${rateUnitLabel(p.unit)}`}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.summaryRow}>
                    <Text variant="bodyMedium" style={styles.summaryLabel}>
                      মোট ভাড়া
                    </Text>
                    <Text variant="titleMedium">{`${taka(grandTotal)}${grandUnitSuffix}`}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text variant="bodyMedium" style={styles.summaryLabel}>
                      অগ্রিম জমা
                    </Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.income }}>
                      {taka(previewAdvance)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text variant="bodyMedium" style={styles.summaryLabel}>
                      বাকি থাকবে
                    </Text>
                    <Text
                      variant="titleMedium"
                      style={{
                        color:
                          grandTotal - previewAdvance > 0
                            ? theme.colors.loss
                            : theme.colors.income,
                      }}
                    >
                      {taka(grandTotal - previewAdvance)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  variant="bodyMedium"
                  style={[styles.summaryEmpty, { color: theme.colors.onSurfaceVariant }]}
                >
                  পরিমাণ দিলে এখানে মোট ভাড়ার হিসাব দেখা যাবে
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <View style={styles.navRow}>
          {step > 0 && (
            <Button mode="text" icon="arrow-left" onPress={() => goTo(step - 1)}>
              আগের ধাপ
            </Button>
          )}
          <View style={styles.navSpacer} />
          {step < TOTAL_STEPS - 1 ? (
            <Button mode="contained" icon="arrow-right" contentStyle={styles.nextContent} onPress={next}>
              পরের ধাপ
            </Button>
          ) : (
            <Button mode="contained" icon="check" onPress={submit} loading={busy} disabled={busy}>
              ভাড়া দিন
            </Button>
          )}
        </View>
      </FormScreen>

      <Portal>
        {/* কীবোর্ড খোলা থাকলেও টোস্ট তার ওপরে ভেসে থাকে */}
        <KeyboardStickyView style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Snackbar visible={!!toast} onDismiss={() => setToast("")} duration={2500}>
            {toast}
          </Snackbar>
        </KeyboardStickyView>
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
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  fill: { height: 6, borderRadius: 3 },
  stepTitle: { marginTop: 2, marginBottom: 12 },
  recapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  cardList: { gap: 10 },
  multiHint: { marginBottom: 2, marginLeft: 4 },
  itemCard: { borderRadius: 14 },
  itemCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  itemCardText: { flex: 1 },
  emptyBox: { alignItems: "center", gap: 12, paddingVertical: 24 },
  // alignSelf stretch — বাংলা টেক্সটের intrinsic মাপে শেষ শব্দ কাটা পড়ে
  emptyText: { textAlign: "center", alignSelf: "stretch" },
  input: { marginBottom: 12 },
  inputTight: { marginBottom: 2 },
  renterHint: { marginBottom: 12, marginLeft: 4, minHeight: 18 },
  itemHeader: { marginBottom: 8 },
  masterUnitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    minHeight: 40,
  },
  // flex:1 — বাংলা টেক্সটের intrinsic মাপে শেষ শব্দ কাটা পড়ে
  masterUnitLabel: { flex: 1 },
  unitRow: { marginBottom: 10 },
  qtyRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  qtyInput: { flex: 1 },
  dateRow: { gap: 8, marginBottom: 12 },
  summary: { borderRadius: 12, padding: 14, gap: 6, marginBottom: 4 },
  summaryEmpty: { textAlign: "center", paddingVertical: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  // বাংলা টেক্সটের intrinsic মাপ Android-এ ছোট আসে — নির্দিষ্ট width না দিলে শেষ শব্দ কাটা পড়ে
  summaryLabel: { flex: 1 },
  navRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  navSpacer: { flex: 1 },
  nextContent: { flexDirection: "row-reverse" },
});
