import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, FAB } from "react-native-paper";
import { EmptyState } from "@/components/empty-state";
import { bn } from "@/lib/format";
import { useRenters } from "@/lib/queries";
import type { Renter } from "@/lib/types";

function RenterCard({ renter }: { renter: Renter }) {
  return (
    <Card style={styles.card} onPress={() => router.push(`/renters/${renter.id}`)}>
      <Card.Title
        title={renter.name}
        subtitle={renter.phone ?? renter.address ?? ""}
        titleStyle={styles.cardTitle}
        right={() =>
          renter.activeRentals ? (
            <Chip compact style={styles.chip}>{`${bn(renter.activeRentals)}টি চলমান`}</Chip>
          ) : null
        }
      />
    </Card>
  );
}

export default function RentersScreen() {
  const { data, isLoading, refetch, isRefetching } = useRenters();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RenterCard renter={item} />}
        contentContainerStyle={data?.length ? styles.list : styles.listEmpty}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon="account-group-outline"
            message={"এখনো কোনো ভাড়াটিয়া নেই।\n+ বাটনে চাপ দিয়ে যোগ করুন।"}
          />
        }
      />
      <FAB icon="plus" style={styles.fab} onPress={() => router.push("/renters/form")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, paddingBottom: 96 },
  listEmpty: { flexGrow: 1 },
  card: { marginBottom: 10 },
  cardTitle: { fontFamily: "NotoSansBengali_500Medium" },
  chip: { marginRight: 12 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
