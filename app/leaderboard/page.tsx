import Home from "@/app/page";
export const dynamic = "force-dynamic";
export default function Leaderboard() {
  return Home({ searchParams: Promise.resolve({ view: "all_time" }) });
}
