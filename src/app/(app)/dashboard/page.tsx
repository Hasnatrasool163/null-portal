import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartExample } from "@/components/chart-example";
import { getCurrentUser } from "@/server/auth/current-user";
import { itemService } from "@/server/services/item.service";
import { STATUS_LABEL, ITEM_STATUSES } from "@/shared/schemas/item";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!; // layout guarantees a user
  const stats = await itemService.stats(user);
  const total = ITEM_STATUSES.reduce((n, s) => n + (stats[s] ?? 0), 0);
  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle={
          user.role === "ADMIN"
            ? "You are viewing everyone's data."
            : "Here is your overview."
        }
        actions={
          <Button asChild>
            <Link href="/items">Manage items</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={total} />
        {ITEM_STATUSES.map((s) => (
          <StatCard key={s} label={STATUS_LABEL[s]} value={stats[s] ?? 0} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Items by status</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartExample
            data={ITEM_STATUSES.map((s) => ({
              name: STATUS_LABEL[s],
              value: stats[s] ?? 0,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
