import { Home } from "lucide-react";

export default function RankLensHomeLink({ className = "" }: { className?: string }) {
  return <a href="/datafast" target="_self" className={"ranklens-home-link " + className} aria-label="Open RankLens front page">
    <Home size={15} aria-hidden="true" />RankLens Home
  </a>;
}
