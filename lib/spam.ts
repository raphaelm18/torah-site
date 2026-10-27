export function droppedAsSpam(form: FormData) {
  const website = String(form.get("website") ?? "").trim();
  const loadedAt = Number(form.get("loadedAt"));
  const elapsed = Date.now() - loadedAt;
  return (
    Boolean(website) ||
    !Number.isFinite(loadedAt) ||
    loadedAt <= 0 ||
    (elapsed >= 0 && elapsed < 3000)
  );
}
