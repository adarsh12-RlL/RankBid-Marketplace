import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function Page() {
  return (
    <>
      <Header />
      <main className="rankbid-reading-page">
        <h1 className="text-2xl font-bold mb-6">Frequently asked questions</h1>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          Today counts verified payments confirmed during the current UTC
          calendar day. All-time adds verified payments across days. A $20
          top-up after $100 yesterday gives $120 all-time and $20 today. Test
          payments never become live revenue. Pending, failed and unverified
          payments do not count. A full refund removes its placement value;
          partial refunds reduce it. Payment processing fees and bank settlement
          times depend on the provider and merchant account. This website does
          not automatically link a bank account.
        </p>
      </main>
      <Footer />
    </>
  );
}
