import Header from '@/components/Header';import Footer from '@/components/Footer';export const dynamic='force-dynamic';
export default function Imprint() {
  const operatorName = process.env.OPERATOR_NAME || "Adarsh Gokhe";
  const supportEmail = process.env.SUPPORT_EMAIL || "adarshgokhe.12@gmail.com";
  return (
    <>
      <Header/>
      <main className="rankbid-reading-page">
        <h1>Operator information</h1>
        <p>Operator: {operatorName}</p>
        <p>Support: <a href={`mailto:${supportEmail}`} className="text-[#FF6B4A] underline">{supportEmail}</a></p>
        <p className="mt-4 text-xs text-stone-400">Fixed Stripe Express Reference: acct_1UQnIzJc5Boa9I3i</p>
      </main>
      <Footer/>
    </>
  );
}
