import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service & Copyright Policy — RankBid",
  description: "Official Terms of Service, Placement Rules, Intellectual Property, and DMCA Copyright Takedown Policy for RankBid.",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="rankbid-reading-page max-w-4xl mx-auto px-4 py-12 text-slate-700 dark:text-slate-300">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Terms of Service & Copyright Policy</h1>
        <p className="text-xs text-slate-500 mb-8">Last updated: November 2026 · Official Legal Document</p>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Platform Overview & Nature of Service</h2>
          <p className="leading-7">
            RankBid is an open, transparent, pay-to-rank product leaderboard and promotional directory. Listings are ranked dynamically based on the verified net amount of payment received. Ranking positions reflect paid promotional placements and do not imply editorial endorsement, quality guarantee, or an objective evaluation of products. Placement on RankBid does not guarantee web traffic, visitor clicks, conversions, or sales.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Intellectual Property & Original Copyright Protection</h2>
          <p className="leading-7 mb-3">
            <strong>© 2026 RankBid. All rights reserved.</strong> The RankBid name, brand marks, logos, user interface design, visual styling, database schema, Nova Mini automated bot, and proprietary software codebase are the exclusive intellectual property of the operator.
          </p>
          <p className="leading-7">
            No portion of this website, including its brand identity, graphics, or code, may be copied, reproduced, scraped, republished, or redistributed without prior written consent from the owner.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Submitter Warranty & Third-Party Trademarks</h2>
          <p className="leading-7 mb-3">
            When you submit a website, product, company profile, logo, or description to RankBid:
          </p>
          <ul className="list-disc pl-6 space-y-2 leading-7 mb-3">
            <li>You warrant and represent that you are the creator, owner, or legally authorized agent with full rights to promote the submitted product and its associated trademarks, logos, and imagery.</li>
            <li>You warrant that your submitted content does not violate any copyright, trademark, patent, trade secret, privacy right, or other intellectual property right of any third party.</li>
            <li>You grant RankBid a non-exclusive, worldwide, royalty-free license to display, render, and index your submitted product name, URL, description, and favicon strictly for leaderboard placement purposes.</li>
          </ul>
          <p className="leading-7 text-sm text-slate-500">
            <strong>Third-Party Disclaimer:</strong> All third-party trademarks, company names, product marks, and logos (such as Stripe, Google, or listed partner products) referenced on RankBid are the property of their respective trademark holders. Reference to them does not constitute affiliation, sponsorship, or endorsement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. DMCA & Copyright Infringement Takedown Policy (Safe Harbor)</h2>
          <p className="leading-7 mb-3">
            RankBid respects intellectual property rights and adheres strictly to safe-harbor copyright protection standards (including the Digital Millennium Copyright Act and the Indian Copyright Act, 1957).
          </p>
          <p className="leading-7 mb-3">
            If you are a copyright or trademark owner (or authorized representative) and believe that any product listing or content hosted on RankBid infringes upon your copyright, you may submit a formal Takedown Notice to our Designated Agent:
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm space-y-1 mb-3">
            <p><strong>Designated Copyright Agent:</strong> Adarsh Gokhe</p>
            <p><strong>Email for Notice:</strong> <a href="mailto:adarshgokhe.12@gmail.com" className="text-orange-600 dark:text-orange-400 underline">adarshgokhe.12@gmail.com</a></p>
            <p><strong>Subject Line:</strong> DMCA Copyright Takedown Notice — RankBid</p>
            <p><strong>Standard Review Window:</strong> 24 to 48 business hours</p>
          </div>
          <p className="leading-7 text-sm">
            Upon receipt of a valid notice containing the identified copyrighted work, the infringing URL/product, and owner contact details, RankBid will promptly disable or remove the disputed content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Payments, Outbidding, and Refund Policy</h2>
          <p className="leading-7 mb-3">
            All prices and bids are in USD. Payments are processed securely via verified third-party payment gateways (including Stripe Checkout). A product&apos;s rank is determined by the total net verified funds paid. Another advertiser may pay more and outrank your position at any time.
          </p>
          <p className="leading-7">
            Refund requests and transaction disputes are reviewed manually by the operator. If a payment is refunded or disputed, the corresponding rank credit is automatically deducted from that product&apos;s leaderboard total.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Contact & Legal Inquiries</h2>
          <p className="leading-7">
            For legal inquiries, partnership requests, or operator identity questions, contact the official administrator at <a href="mailto:adarshgokhe.12@gmail.com" className="text-orange-600 dark:text-orange-400 underline">adarshgokhe.12@gmail.com</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
