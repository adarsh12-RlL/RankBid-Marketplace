import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function Page() {
  return (
    <>
      <Header />
      <main className="rankbid-reading-page">
        <h1 className="text-2xl font-bold mb-6">About RankBid</h1>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          RankBid is a paid-product directory. Placements are advertisements
          ordered by verified payment totals. They are not independent reviews
          or endorsements. Sandbox and live records are kept separate. No
          visitors, sales or income are guaranteed.
        </p>
      </main>
      <Footer />
    </>
  );
}
