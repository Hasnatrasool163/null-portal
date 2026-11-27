import { z } from "zod";
import type { AttemptStatus } from "./attempt";

export const INCIDENT_TYPES = [
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "COPY_PASTE",
  "DISCONNECT",
  "RECONNECT",
  "LATE_SYNC",
  "LATE_REJECTED",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_LABEL: Record<IncidentType, string> = {
  TAB_HIDDEN: "Tab hidden",
  WINDOW_BLUR: "Window lost focus",
  FULLSCREEN_EXIT: "Exited fullscreen",
  COPY_PASTE: "Copy / paste",
  DISCONNECT: "Disconnected",
  RECONNECT: "Reconnected",
  LATE_SYNC: "Late offline sync accepted",
  LATE_REJECTED: "Late offline sync rejected",
};

export const createIncidentSchema = z.object({
  type: z.enum(INCIDENT_TYPES),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const createAnnouncementSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Announcement cannot be empty")
    .max(1000, "Announcement is too long"),
});

export const grantExtensionSchema = z.object({
  minutes: z
    .number({ error: "Enter minutes" })
    .int("Whole minutes only")
    .min(1, "At least 1 minute")
    .max(120, "At most 120 minutes"),
  reason: z
    .string()
    .trim()
    .min(3, "Provide a brief reason for the audit log")
    .max(500, "Reason is too long"),
});
export type GrantExtensionInput = z.infer<typeof grantExtensionSchema>;

export type AnnouncementItem = {
  id: string;
  message: string;
  authorName: string;
  createdAt: string;
};

export type IncidentItem = {
  id: string;
  type: IncidentType;
  occurredAt: string;
  details: Record<string, unknown>;
};

export type TimeExtensionItem = {
  id: string;
  minutes: number;
  reason: string;
  grantedByName: string;
  createdAt: string;
};

export type HeartbeatResponse = {
  serverNow: string;
  deadlineAt: string;
  status: AttemptStatus;
  announcements: AnnouncementItem[];
};

export type MonitorAttempt = {
  attemptId: string;
  candidateName: string;
  candidateEmail: string;
  status: AttemptStatus;
  answeredCount: number;
  totalQuestions: number;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  lastSeenAt: string;
  lastSeenAgeSeconds: number;
  incidentCount: number;
  disconnectCount: number;
  totalOfflineSeconds: number;
  lateSyncCount: number;
  incidents: IncidentItem[];
  extensions: TimeExtensionItem[];
};

export type MonitorResponse = {
  examId: string;
  examTitle: string;
  serverNow: string;
  announcements: AnnouncementItem[];
  attempts: MonitorAttempt[];
};
