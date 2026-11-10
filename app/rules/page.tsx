import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function Page() {
  return (
    <>
      <Header />
      <main className="rankbid-reading-page">
        <h1 className="text-2xl font-bold mb-6">Placement rules</h1>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          A new listing starts at the configured minimum, currently $1.
          Existing listings pay only the difference between the target total and
          confirmed spend on the selected board, with a minimum $1 increase. The
          suggested #1 claim is the current leader plus $5. Equal totals use the
          earliest qualifying payment and then product ID. Payment does not
          reserve a position: the provider must confirm payment before a listing
          appears. Submitters must own the product or be authorized to represent
          it. Listings that violate these rules may be reviewed or removed.
          Illegal, deceptive, phishing and malware listings are prohibited.
        </p>
      </main>
      <Footer />
    </>
  );
}
