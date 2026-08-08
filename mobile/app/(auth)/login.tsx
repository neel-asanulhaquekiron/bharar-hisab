import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
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
          ভাড়ার হিসাব
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          আপনার অ্যাকাউন্টে লগইন করুন
        </Text>
        <TextInput
          label="ইমেইল"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          label="পাসওয়ার্ড"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
          style={styles.input}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button
          mode="contained"
          onPress={submit}
          loading={busy}
          disabled={busy || !email || !password}
        >
          লগইন
        </Button>
        <Link href="/(auth)/register" asChild>
          <Button mode="text" style={styles.link}>
            নতুন অ্যাকাউন্ট খুলুন
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
