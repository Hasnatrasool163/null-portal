import { AdminDisputes } from "@/components/admin-disputes";
import { PageHeader } from "@/components/ui/blocks";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Disputes" };

export default async function AdminDisputesPage() {
  await requireRole(["ADMIN"]);
  return (
    <>
      <PageHeader
        title="Result disputes"
        subtitle="Escalated disputes need an independent final decision. Every decision is written, visible to the candidate and audited."
      />
      <AdminDisputes />
    </>
  );
}
