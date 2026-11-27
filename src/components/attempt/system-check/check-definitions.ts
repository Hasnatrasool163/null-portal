import {
  Clock,
  HardDrive,
  Maximize,
  Save,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export type CheckStatus = "running" | "pass" | "warn" | "fail";
export type Check = { status: CheckStatus; detail: string };
export type CheckId =
  "network" | "clock" | "storage" | "fullscreen" | "autosave";
export type CheckResults = Record<CheckId, Check>;

/** Chip labels for the compact view. */
export const SHORT_LABEL: Record<CheckId, string> = {
  network: "Connection",
  autosave: "Autosave",
  storage: "Offline storage",
  clock: "Device clock",
  fullscreen: "Fullscreen",
};

/** Display order. Only `required` checks can block starting the exam. */
export const CHECKS: {
  id: CheckId;
  label: string;
  icon: LucideIcon;
  required: boolean;
}[] = [
  {
    id: "network",
    label: "Connection to exam server",
    icon: Wifi,
    required: true,
  },
  { id: "autosave", label: "Autosave test", icon: Save, required: true },
  {
    id: "storage",
    label: "Offline answer storage",
    icon: HardDrive,
    required: false,
  },
  { id: "clock", label: "Device clock", icon: Clock, required: false },
  {
    id: "fullscreen",
    label: "Fullscreen support",
    icon: Maximize,
    required: false,
  },
];

export const runningChecks = (): CheckResults => ({
  network: { status: "running", detail: "Measuring…" },
  autosave: { status: "running", detail: "Saving a test answer…" },
  storage: { status: "running", detail: "Writing a test record…" },
  clock: { status: "running", detail: "Comparing with server time…" },
  fullscreen: { status: "running", detail: "Checking…" },
});
