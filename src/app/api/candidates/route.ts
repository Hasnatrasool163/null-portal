import { authedRoute } from "@/server/http";
import { enrollmentService } from "@/server/services/enrollment.service";
import { candidateSearchQuerySchema } from "@/shared/schemas/exam";

export const GET = authedRoute(
  { query: candidateSearchQuerySchema },
  async ({ query }) =>
    enrollmentService.searchCandidates(query.q, query.examId),
  ["EXAMINER"],
);
