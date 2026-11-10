import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function Contact() {
  const email = process.env.SUPPORT_EMAIL || "adarshgokhe.12@gmail.com";
  const valid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <>
      <Header />
      <main className="rankbid-reading-page">
        <h1 className="text-2xl font-bold mb-6">Contact the owner</h1>
        {valid ? (
          <a href={"mailto:" + email} className="text-[#FF6B4A] underline">
            {email}
          </a>
        ) : (
          <p>
            The owner has not configured a support email yet. Complete
            SUPPORT_EMAIL before live launch. No message has been submitted.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
