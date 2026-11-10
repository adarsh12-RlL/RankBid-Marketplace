"use client";

import { useState } from "react";
import { BookOpen, Captions, MonitorPlay, Volume2 } from "lucide-react";
import type { GuideScene } from "@/lib/ranklens-guides";

export default function RankLensTutorial({ slug, title, scenes, duration }: { slug: string; title: string; scenes: GuideScene[]; duration: string }) {
  const [actualDuration, setActualDuration] = useState<string | null>(null);
  const video = `/tutorials/${slug}.mp4`;
  const captions = `/tutorials/${slug}.vtt`;
  const durationLabel = actualDuration || duration;

  return <section className="rl-tutorial" aria-label={`${title} video tutorial`}>
    <div className="rl-tutorial-top">
      <div>
        <span className="rl-doc-eyebrow"><MonitorPlay size={14}/> SCREEN WALKTHROUGH</span>
        <h2>{title}</h2>
      </div>
      <span className="rl-tutorial-duration">{durationLabel} · narrated in English</span>
    </div>
    <div className="rl-video-frame">
      <video className="rl-tutorial-video" controls preload="metadata" playsInline poster={`/tutorials/${slug}.jpg`} aria-label={`${title}, narrated RankLens screen walkthrough`} onLoadedMetadata={(event) => {
        const seconds = Math.floor(event.currentTarget.duration);
        if (Number.isFinite(seconds) && seconds > 0) setActualDuration(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`);
      }}>
        <source src={video} type="video/mp4" />
        <track kind="captions" srcLang="en" label="English captions" src={captions} default />
        Your browser cannot play this walkthrough. Read the written steps below.
      </video>
      <div className="rl-tutorial-meta"><span><Volume2 size={14}/> English narration</span><span><Captions size={14}/> English captions</span><span><BookOpen size={14}/> {scenes.length} explained steps</span></div>
      <p className="rl-video-note" role="note">This walkthrough uses real RankBid/RankLens screens from the local build. Any sample values shown are test data, not live customer activity.</p>
    </div>
  </section>;
}
