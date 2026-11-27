/** Inline validation message, announced when it appears. */
export function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p
      id={id}
      role="alert"
      className="animate-page-in text-destructive text-xs"
    >
      {msg}
    </p>
  );
}
