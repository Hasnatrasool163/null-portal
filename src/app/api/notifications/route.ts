import { authedRoute } from "@/server/http";
import { notificationService } from "@/server/notifications";
import { runDisputeClock } from "@/server/dispute-clock";

export const GET = authedRoute({}, async ({ user }) => {
  // Time-based dispute rules (reminders, auto-escalation, finalisation) piggyback on the bell poll.
  await runDisputeClock();
  return notificationService.list(user.id);
});
