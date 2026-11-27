import { authedRoute } from "@/server/http";
import { listAudit } from "@/server/audit";
import { examService } from "@/server/services/exam.service";
import { auditListQuerySchema } from "@/shared/schemas/audit";

/** Exam-scoped audit trail: the owning examiner or an admin (others get 404). */
export const GET = authedRoute(
  { query: auditListQuerySchema },
  async ({ user, params, query }) => {
    const exam = await examService.get(user, params.id);
    return listAudit(query, exam.id);
  },
  ["EXAMINER", "ADMIN"],
);
