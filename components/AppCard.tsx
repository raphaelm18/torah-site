import { torahApp } from "@/lib/site";

export function AppCard() {
  return (
    <a
      className="app-card"
      href={torahApp.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <p className="kicker">App</p>
      <h3>{torahApp.title}</h3>
      <p>{torahApp.description}</p>
      <p className="host">{torahApp.host}</p>
      <p className="open">Open</p>
    </a>
  );
}
