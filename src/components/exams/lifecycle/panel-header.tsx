/** Title + one-line description strip at the top of a lifecycle panel card. */
export function PanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b px-5 py-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
    </div>
  );
}
