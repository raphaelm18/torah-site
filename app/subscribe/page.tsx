import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata = {
  title: "Subscribe",
  description: "Get new pieces by email.",
};

export default function SubscribePage() {
  return (
    <>
      <h1>Subscribe</h1>
      <p className="page-intro">
        When a piece is published, it goes out by email. The note is the title,
        the short summary, and a link back here. You can leave whenever you want.
      </p>
      <SubscribeForm />
    </>
  );
}
