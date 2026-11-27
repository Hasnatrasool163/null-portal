import { AuditLogView } from "@/components/audit/audit-log-view";
import { PageHeader } from "@/components/ui/blocks";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  await requireRole(["ADMIN"]);
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Who published results, changed grades, granted extra time or changed roles."
      />
      <AuditLogView />
    </>
  );
}
