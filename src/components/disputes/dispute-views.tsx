/**
 * Public entry point for dispute UI. Each component lives in its own file;
 * this module re-exports them so existing imports keep working.
 */
export { DisputeStatusBadge } from "@/components/disputes/dispute-status-badge";
export { FileDisputeDialog } from "@/components/disputes/filing/file-dispute-dialog";
export { DisputeDialog } from "@/components/disputes/detail/dispute-dialog";
export { DisputeTable } from "@/components/disputes/list/dispute-table";
export { NeedsActionNote } from "@/components/disputes/list/needs-action-note";
