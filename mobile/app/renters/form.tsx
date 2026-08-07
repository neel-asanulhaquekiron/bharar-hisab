import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";
import { apiError } from "@/lib/api";
import { useRenters, useSaveRenter } from "@/lib/queries";

export default function RenterFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: renters } = useRenters();
  const existing = renters?.find((r) => r.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");

  const save = useSaveRenter(id);

  const submit = async () => {
    setError("");
    try {
      await save.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: existing ? "ভাড়াটিয়া সম্পাদনা" : "নতুন ভাড়াটিয়া",
          headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <TextInput label="নাম" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          label="ফোন (ঐচ্ছিক)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          label="ঠিকানা (ঐচ্ছিক)"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
        />
        <TextInput
          label="নোট (ঐচ্ছিক)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.input}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button
          mode="contained"
          onPress={submit}
          loading={save.isPending}
          disabled={!name.trim() || save.isPending}
        >
          সংরক্ষণ করুন
        </Button>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
});
