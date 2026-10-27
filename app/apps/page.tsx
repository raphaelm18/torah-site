import { AppCard } from "@/components/AppCard";

export const metadata = {
  title: "Apps",
  description: "Tools that sit beside the writing.",
};

export default function AppsPage() {
  return (
    <>
      <h1>Apps</h1>
      <p className="page-intro">Tools that sit beside the writing.</p>
      <div className="section">
        <AppCard />
      </div>
    </>
  );
}
