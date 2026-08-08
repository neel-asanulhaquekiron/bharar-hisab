import * as Contacts from "expo-contacts";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";
import { FormScreen } from "@/components/form-screen";
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
        if (contact.name) setName(contact.name);
        const picked = contact.phoneNumbers?.[0]?.number;
        if (picked) setPhone(picked.replace(/[\s-]/g, ""));
      }
    } catch (e) {
      setError(apiError(e));
    }
  };

  const submit = async () => {
    setError("");
    try {
      await save.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
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
      <Stack.Screen options={{ title: existing ? "ভাড়াটিয়া সম্পাদনা" : "নতুন ভাড়াটিয়া" }} />
      <FormScreen contentStyle={styles.container}>
        <Button
          mode="outlined"
          icon="card-account-phone"
          onPress={pickFromContacts}
          style={styles.input}
        >
          কন্টাক্ট থেকে আনুন
        </Button>
        <TextInput label="নাম" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          label="ফোন নম্বর"
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
          disabled={!name.trim() || !phone.trim() || save.isPending}
        >
          সংরক্ষণ করুন
        </Button>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  input: { marginBottom: 12 },
});
