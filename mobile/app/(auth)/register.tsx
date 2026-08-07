import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.form}>
        <Text variant="displaySmall" style={styles.title}>
          নিবন্ধন
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          প্রথমবার ব্যবহারের জন্য অ্যাকাউন্ট খুলুন
        </Text>
        <TextInput label="নাম" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          label="ইমেইল"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          label="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button
          mode="contained"
          onPress={submit}
          loading={busy}
          disabled={busy || !name || !email || password.length < 6}
        >
          অ্যাকাউন্ট খুলুন
        </Button>
        <Link href="/(auth)/login" asChild>
          <Button mode="text" style={styles.link}>
            আগের অ্যাকাউন্টে লগইন করুন
          </Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  form: { paddingHorizontal: 24 },
  title: { textAlign: "center", marginBottom: 4 },
  subtitle: { textAlign: "center", marginBottom: 24, opacity: 0.7 },
  input: { marginBottom: 12 },
  link: { marginTop: 8 },
});
