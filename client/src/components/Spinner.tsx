
export default function Spinner({ fullPage = false }: { fullPage?: boolean }) {
  if (!fullPage) return <div className="spinner" role="status" aria-label="Загрузка…" />;

  return (
    <div className="spinner-wrap" role="status" aria-label="Загрузка…">
      <div className="spinner" />
    </div>
  );
}
