import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function Cancel() {
  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto p-6 py-16">
        <h1 className="text-2xl font-bold">Checkout was not completed</h1>
        <p className="mt-4 text-gray-500">
          No rank is credited without verified payment. A pending checkout
          expires after 30 minutes. You can review its status in your dashboard.
        </p>
        <Link href="/dashboard" className="inline-block mt-6 text-[#FF6B4A]">
          My listings →
        </Link>
      </main>
      <Footer />
    </>
  );
}
