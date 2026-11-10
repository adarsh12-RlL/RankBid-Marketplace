import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import RankLensTutorial from "@/components/RankLensTutorial";
import RankBidMark from "@/components/RankBidMark";
import ApiDocsGuide from "@/components/ApiDocsGuide";
import { RANKLENS_GUIDES, type RankLensGuide } from "@/lib/ranklens-guides";

export default function RankLensDocs({ guide }: { guide: RankLensGuide }) {
  const index = RANKLENS_GUIDES.findIndex((item) => item.slug === guide.slug);
  const previous = index > 0 ? RANKLENS_GUIDES[index - 1] : null;
  const next = index < RANKLENS_GUIDES.length - 1 ? RANKLENS_GUIDES[index + 1] : null;
  return <main className="rl-docs">
    <header className="rl-docs-header"><Link href="/datafast" className="rl-brand"><i><RankBidMark size={22}/></i>RankLens</Link><span className="rl-docs-label"><BookOpen size={15}/> DOCUMENTATION</span><nav><Link href="/datafast/dashboard">Dashboard</Link><Link href="/datafast/dashboard/settings">Settings</Link></nav></header>
    <div className="rl-docs-layout">
      <aside className="rl-docs-sidebar"><span>RANKLENS GUIDE</span>{RANKLENS_GUIDES.map((item) => <Link key={item.slug} href={`/datafast/docs/${item.slug}`} aria-current={item.slug === guide.slug ? "page" : undefined}>{item.title}</Link>)}<Link className="rl-docs-sidebar-cta" href="/datafast/dashboard/new">Add a website <ArrowRight size={14}/></Link></aside>
      <article className="rl-docs-article">
        <Link href="/datafast" className="rl-doc-back"><ArrowLeft size={14}/> RankLens home</Link>
        <span className="rl-doc-eyebrow">RANKLENS DOCUMENTATION</span><h1>{guide.title}</h1><p className="rl-doc-summary">{guide.summary}</p>
        <RankLensTutorial slug={guide.slug} title={guide.title} scenes={guide.scenes} duration={guide.duration}/>
        {guide.slug === "api" && <ApiDocsGuide />}
        <section className="rl-doc-content"><h2 id="how-this-works">How this works</h2><ol>{guide.scenes.map((scene) => <li key={scene.title}><b>{scene.title}</b><p>{scene.narration}</p></li>)}</ol>
          <div className="rl-doc-callout"><ShieldCheck size={18}/><div><strong>Keep access scoped and private</strong><p>RankLens shows each customer only their own websites. Never share passwords, payment details, or API keys in a support message.</p></div></div>
          <h2 id="before-you-continue">Before you continue</h2><ul>{guide.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        </section>
        <nav className="rl-doc-next" aria-label="Guide navigation">{previous ? <Link href={`/datafast/docs/${previous.slug}`}><span>PREVIOUS</span><b><ArrowLeft size={15}/>{previous.title}</b></Link> : <span/>}{next && <Link href={`/datafast/docs/${next.slug}`}><span>NEXT</span><b>{next.title}<ArrowRight size={15}/></b></Link>}</nav>
      </article>
      <aside className="rl-docs-toc"><span>ON THIS PAGE</span><a href="#how-this-works">1 / How this works</a><a href="#before-you-continue">2 / Before you continue</a><Link href="/feedback">Contact the owner</Link></aside>
    </div>
    <footer className="rl-docs-footer"><Link href="/datafast">RankLens home</Link><Link href="/datafast/dashboard/billing">Billing</Link><Link href="/privacy">Privacy</Link><span>Original RankLens guides · English</span></footer>
  </main>;
}
