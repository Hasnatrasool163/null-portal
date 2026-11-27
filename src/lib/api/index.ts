/**
 * Typed client for the app's HTTP API. Components and hooks call these
 * functions instead of building URLs, so every endpoint lives in one place.
 */
export { api, ApiClientError, applyFieldErrors, qs } from "./client";
export { attemptsApi } from "./attempts";
export { examsApi, type RescoreRun } from "./exams";
export {
  questionsApi,
  topicsApi,
  type DrawResult,
  type QuestionListFilters,
} from "./questions";
export { usersApi, type IssuedCredentials } from "./users";
export { authApi, notificationsApi, preferencesApi } from "./account";
export { disputesApi } from "./disputes";
export { auditApi, systemApi } from "./system";
