import { router } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, FAB, SegmentedButtons, Text } from "react-native-paper";
import { EmptyState } from "@/components/empty-state";
import { bn, bnDate, statusLabel, taka } from "@/lib/format";
import { useRentals } from "@/lib/queries";
import type { Rental } from "@/lib/types";

function RentalCard({ rental }: { rental: Rental }) {
  return (
    <Card style={styles.card} onPress={() => router.push(`/rentals/${rental.id}`)}>
      <Card.Title
        title={`${rental.item.name} — ${bn(rental.quantity)}টি`}
        subtitle={`${rental.renter.name} · ${bnDate(rental.startDate)} থেকে`}
        titleStyle={styles.cardTitle}
        right={() => (
          <Chip compact style={styles.chip}>
            {statusLabel(rental.status)}
          </Chip>
        )}
      />
      <Card.Content>
        <Text variant="bodyMedium">
          ভাড়া {taka(rental.financials.charge)} · বাকি {taka(rental.financials.due)}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function RentalsScreen() {
  const [filter, setFilter] = useState<"OPEN" | "RETURNED">("OPEN");
  const { data, isLoading, refetch, isRefetching } = useRentals(filter);

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={(v) => setFilter(v as "OPEN" | "RETURNED")}
        buttons={[
          { value: "OPEN", label: "চলমান" },
          { value: "RETURNED", label: "ফেরত সম্পন্ন" },
        ]}
        style={styles.filter}
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RentalCard rental={item} />}
          contentContainerStyle={data?.length ? styles.list : styles.listEmpty}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-text-outline"
              message={
                filter === "OPEN"
                  ? "কোনো চলমান ভাড়া নেই।\n+ বাটনে চাপ দিয়ে নতুন ভাড়া দিন।"
                  : "কোনো ফেরত সম্পন্ন ভাড়া নেই।"
              }
            />
          }
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={() => router.push("/rentals/new")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filter: { margin: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 96 },
  listEmpty: { flexGrow: 1 },
  card: { marginBottom: 10 },
  cardTitle: { fontFamily: "NotoSansBengali_500Medium" },
  chip: { marginRight: 12 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
