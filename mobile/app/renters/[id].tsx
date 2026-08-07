import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  List,
  Portal,
  Text,
} from "react-native-paper";
import { apiError } from "@/lib/api";
import { bn, bnDate, statusLabel, taka } from "@/lib/format";
import { useDeleteRenter, useRenterSummary } from "@/lib/queries";

export default function RenterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useRenterSummary(id);
  const remove = useDeleteRenter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const doDelete = async () => {
    setConfirmDelete(false);
    try {
      await remove.mutateAsync(id);
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
          title: data?.renter.name ?? "ভাড়াটিয়া",
          headerTitleStyle: { fontFamily: "NotoSansBengali_500Medium" },
        }}
      />
      {isLoading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.card}>
            <Card.Content>
              {data.renter.phone ? (
                <List.Item
                  title={bn(data.renter.phone)}
                  description="কল করতে চাপ দিন"
                  left={(p) => <List.Icon {...p} icon="phone" />}
                  onPress={() => Linking.openURL(`tel:${data.renter.phone}`)}
                />
              ) : null}
              {data.renter.address ? (
                <List.Item
                  title={data.renter.address}
                  left={(p) => <List.Icon {...p} icon="map-marker" />}
                />
              ) : null}
              {data.renter.notes ? (
                <List.Item
                  title={data.renter.notes}
                  left={(p) => <List.Icon {...p} icon="note-text" />}
                />
              ) : null}
              <View style={styles.totalsRow}>
                <View style={styles.totalBox}>
                  <Text variant="labelMedium">মোট ভাড়া</Text>
                  <Text variant="titleMedium">{taka(data.totals.charge)}</Text>
                </View>
                <View style={styles.totalBox}>
                  <Text variant="labelMedium">জমা</Text>
                  <Text variant="titleMedium" style={styles.paid}>
                    {taka(data.totals.paid)}
                  </Text>
                </View>
                <View style={styles.totalBox}>
                  <Text variant="labelMedium">বাকি</Text>
                  <Text
                    variant="titleMedium"
                    style={data.totals.due > 0 ? styles.due : styles.paid}
                  >
                    {taka(data.totals.due)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            ভাড়ার ইতিহাস
          </Text>
          {data.rentals.length === 0 && (
            <Text style={styles.empty}>এখনো কোনো ভাড়া নেই</Text>
          )}
          {data.rentals.map((rental) => (
            <Card
              key={rental.id}
              style={styles.card}
              onPress={() => router.push(`/rentals/${rental.id}`)}
            >
              <Card.Title
                title={`${rental.item.name} — ${bn(rental.quantity)}টি`}
                subtitle={`${bnDate(rental.startDate)} থেকে`}
                titleStyle={styles.cardTitle}
                right={() => (
                  <Chip compact style={styles.chip}>
                    {statusLabel(rental.status)}
                  </Chip>
                )}
              />
              <Card.Content>
                <Text variant="bodyMedium">
                  ভাড়া {taka(rental.financials.charge)} · জমা {taka(rental.financials.paid)} ·
                  বাকি {taka(rental.financials.due)}
                </Text>
              </Card.Content>
            </Card>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              icon="pencil"
              onPress={() => router.push({ pathname: "/renters/form", params: { id } })}
            >
              সম্পাদনা
            </Button>
            <Button
              mode="outlined"
              icon="delete"
              textColor="crimson"
              onPress={() => setConfirmDelete(true)}
            >
              মুছুন
            </Button>
          </View>
        </ScrollView>
      )}
      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>মুছে ফেলবেন?</Dialog.Title>
          <Dialog.Content>
            <Text>&ldquo;{data?.renter.name}&rdquo; মুছে ফেলা হবে।</Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 12, paddingBottom: 32 },
  card: { marginBottom: 10 },
  cardTitle: { fontFamily: "NotoSansBengali_500Medium" },
  chip: { marginRight: 12 },
  totalsRow: { flexDirection: "row", marginTop: 8 },
  totalBox: { flex: 1, alignItems: "center" },
  paid: { color: "#2e7d32" },
  due: { color: "#c62828" },
  sectionTitle: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  empty: { opacity: 0.6, marginLeft: 4, marginBottom: 8 },
  error: { color: "#c62828", marginTop: 8 },
  actions: { flexDirection: "row", gap: 12, marginTop: 16, justifyContent: "center" },
});
