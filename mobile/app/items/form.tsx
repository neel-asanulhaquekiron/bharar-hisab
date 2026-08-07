import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { FormScreen } from "@/components/form-screen";
import { apiError } from "@/lib/api";
import { useDeleteItem, useItems, useSaveItem } from "@/lib/queries";

export default function ItemFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: items } = useItems();
  const existing = items?.find((i) => i.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [totalQuantity, setTotalQuantity] = useState(
    existing ? String(existing.totalQuantity) : "",
  );
  const [rate, setRate] = useState(existing ? String(existing.rate) : "");
  const [rateUnit, setRateUnit] = useState<"DAILY" | "MONTHLY">(
    existing?.rateUnit ?? "DAILY",
  );
  const [initialCost, setInitialCost] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = useSaveItem(id);
  const remove = useDeleteItem();

  const submit = async () => {
    setError("");
    try {
      await save.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        totalQuantity: Number(totalQuantity),
        rate: Number(rate),
        rateUnit,
        ...(!existing && Number(initialCost) > 0
          ? { initialCost: Number(initialCost) }
          : {}),
      });
      router.back();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    setError("");
    try {
      await remove.mutateAsync(id!);
      router.back();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const valid =
    name.trim() && Number(totalQuantity) >= 0 && rate !== "" && Number(rate) >= 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: existing ? "মালামাল সম্পাদনা" : "নতুন মালামাল",
          headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        }}
      />
      <FormScreen contentStyle={styles.container}>
        <TextInput label="নাম" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          label="বিবরণ (ঐচ্ছিক)"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />
        <TextInput
          label="মোট পরিমাণ"
          value={totalQuantity}
          onChangeText={setTotalQuantity}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          label="ভাড়ার হার (৳)"
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <SegmentedButtons
          value={rateUnit}
          onValueChange={(v) => setRateUnit(v as "DAILY" | "MONTHLY")}
          buttons={[
            { value: "DAILY", label: "দৈনিক" },
            { value: "MONTHLY", label: "মাসিক" },
          ]}
          style={styles.input}
        />
        {!existing && (
          <TextInput
            label="মোট ক্রয় খরচ (৳, ঐচ্ছিক)"
            value={initialCost}
            onChangeText={setInitialCost}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        )}
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button
          mode="contained"
          onPress={submit}
          loading={save.isPending}
          disabled={!valid || save.isPending}
        >
          সংরক্ষণ করুন
        </Button>
        {existing && (
          <Button
            mode="outlined"
            textColor="crimson"
            style={styles.delete}
            onPress={() => setConfirmDelete(true)}
            loading={remove.isPending}
          >
            মুছে ফেলুন
          </Button>
        )}
      </FormScreen>
      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>মুছে ফেলবেন?</Dialog.Title>
          <Dialog.Content>
            <Text>&ldquo;{existing?.name}&rdquo; মুছে ফেলা হবে।</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>বাতিল</Button>
            <Button textColor="crimson" onPress={doDelete}>
              মুছে ফেলুন
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  input: { marginBottom: 12 },
  delete: { marginTop: 12 },
});
