import { authedRoute } from "@/server/http";

export const GET = authedRoute({}, async ({ user }) => user);
