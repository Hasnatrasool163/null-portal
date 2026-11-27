import { publicRoute } from "@/server/http";
import { authService } from "@/server/services/auth.service";

export const POST = publicRoute({}, async () => {
  await authService.logout();
  return null;
});
