/** Save the one-time temporary passwords as a CSV download in the browser. */
export function downloadCredentialsCsv(
  rows: { name: string; email: string; tempPassword: string }[],
) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    "name,email,temporary_password",
    ...rows.map((r) => `${esc(r.name)},${esc(r.email)},${esc(r.tempPassword)}`),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "candidate-credentials.csv";
  a.click();
  URL.revokeObjectURL(url);
}
