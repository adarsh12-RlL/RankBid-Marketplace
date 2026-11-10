import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
export default function Page() {
  return (
    <>
      <Header />
      <main className="rankbid-reading-page">
        <h1 className="text-2xl font-bold mb-6">Privacy</h1>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          Account emails, password hashes, session hashes, listings and payment
          references are stored in a local SQLite database. Passwords and full
          payment card details are not stored in plain text. The payment
          provider hosts live card checkout. Public listings do not expose
          account emails or provider payment IDs. Outbound clicks use a daily
          hash rather than a raw IP address; these are click events, not a
          verified live-visitor counter. Product icons may load from Google
          favicon services. Session cookies are used for sign-in. Ask the owner
          about account removal, retention and data export before using the live
          service. When the owner enables a
          supported trusted proxy, analytics stores only the visitor&apos;s
          two-letter country code for aggregate reports. Raw IP addresses are
          never stored in the analytics database. Without a configured proxy,
          country is shown as Unknown. Basic request network details may be
          processed briefly in memory to rate-limit sign-in and prevent abuse;
          they are not saved as visitor location history. Earlier location
          fields are cleared by a one-time migration.
          See the <Link href="/datafast/docs#visitor-location" className="underline underline-offset-2">privacy and safety guide</Link>.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-3">Feedback and reviews</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          Feedback messages and optional contact email are visible only to the
          site admin and are automatically deleted 30 days after submission. A
          private, unguessable reply link is provided so you can check the admin
          response; this website does not send reply emails. Feedback is shown
          publicly only if you opt in and the admin approves it, and is also
          deleted after 30 days. Reviews are shown after admin approval and can
          be hidden and published again later. Public entries show the display
          name and message, never the email address.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-3">Automated support answers</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          The support panel uses prepared question-and-answer topics in your
          browser. Typed questions are matched locally to those topics; unmatched
          questions are not sent anywhere. If you choose to send a private message
          to the admin, that message is handled under the Feedback and reviews
          section above. Do not include passwords, verification codes, payment
          details, or private account secrets.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-3">Optional location sharing</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-7">
          You may choose Share location to place an approximate location on the
          public RankBid visitor map. RankBid asks for browser location permission
          only after you choose Allow sharing. The browser result is rounded to
          a 0.1° grid before it is sent to the server, roughly 10 km at the equator.
          The server also enforces this rounding. Exact browser coordinates, names
          and email addresses are not included in public map markers. Visitors in
          the same grid area appear as a combined count. This is a one-time location
          snapshot, not continuous movement tracking.
        </p>
        <p className="text-gray-600 dark:text-gray-300 leading-7 mt-4">
          The latest shared grid area is associated with an anonymous visitor
          cookie and expires after 24 hours. Choose Remove my location to withdraw
          it earlier. Temporary location shares are excluded from database backups.
          Expired entries are deleted when location data is next accessed. If you clear that cookie, the browser can no longer identify
          its saved entry for removal; the entry still expires automatically.
          Permission denial does not prevent normal website use. Your browser
          stores the permission decision, while RankBid stores only the sharing
          expiry time in browser storage. Other websites added to RankLens use
          country aggregates; their tracking snippet does not request browser
          location permission. Map tiles load from the map provider, which receives
          normal network requests when you open or navigate the detailed map.
        </p>
      </main>
      <Footer />
    </>
  );
}
