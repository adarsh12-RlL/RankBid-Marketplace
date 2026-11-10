import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, Brain, Clock3, Gamepad2, Grid2X2, Sparkles } from "lucide-react";
import { GAMES, type GameInfo, type GameGroup } from "@/lib/game-catalog";

const ICONS: Record<string, string> = {
  letters: "Aa", cards: "✦", quiz: "?", numbers: "2048", grid: "9×9", mine: "✹",
  sequence: "●", tictactoe: "×○", hangman: "A–Z", math: "∑", snake: "↗",
  typing: "⌨", rps: "✊", color: "◉", reflex: "↯",
};

function GameCard({ game, index }: { game: GameInfo; index: number }) {
  return <Link href={`/games/${game.id}`} className={`game-library-card art-${game.id}`}>
    <div className="game-card-art" aria-hidden="true">
      <span className="game-art-orbit one"/><span className="game-art-orbit two"/>
      <span className="game-art-icon">{ICONS[game.icon] ?? "✦"}</span>
      <span className="game-art-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="game-art-spark">✦</span>
    </div>
    <div className="game-card-content">
      <div className="game-card-tags"><span>{game.challenge}</span><span><Clock3 size={12}/>{game.minutes} min</span></div>
      <h3>{game.name}</h3>
      <p>{game.description}</p>
      <span className="game-card-play">Play game <ArrowRight size={15}/></span>
    </div>
  </Link>;
}

function GameGroupSection({ title, subtitle, games, startIndex, icon }: { title: GameGroup; subtitle: string; games: GameInfo[]; startIndex: number; icon: "brain" | "arcade" }) {
  return <section className="game-group-section" aria-labelledby={`group-${icon}`}>
    <div className="game-group-heading">
      <div className="game-group-icon">{icon === "brain" ? <Brain size={19}/> : <Gamepad2 size={19}/>}</div>
      <div><h2 id={`group-${icon}`}>{title}</h2><p>{subtitle}</p></div>
      <span className="game-group-count">{games.length} games</span>
    </div>
    <div className="game-library-grid">{games.map((game, index) => <GameCard key={game.id} game={game} index={startIndex + index}/>)}</div>
  </section>;
}

export default function GamesPage() {
  const thinking = GAMES.filter(game => game.group === "Think & solve");
  const breaks = GAMES.filter(game => game.group === "Quick breaks");
  return <div className="rankbid-page games-page">
    <Header />
    <main className="rankbid-page-main game-library-main">
      <section className="game-library-hero">
        <div className="game-library-hero-copy">
          <span className="rankbid-page-kicker"><Sparkles size={14}/> THE RANKBID ARCADE</span>
          <h1>Games for your<br/><em>next little break.</em></h1>
          <p>Sharpen your focus, solve a puzzle or play a quick round. Pick a game and jump straight in.</p>
          <div className="game-library-actions"><a className="game-library-cta" href="#think-and-solve">Explore games <ArrowRight size={16}/></a><span><span className="game-live-dot"/>All 15 games are free to play</span></div>
        </div>
        <div className="game-hero-visual" aria-hidden="true"><div className="game-hero-orbit orbit-a"/><div className="game-hero-orbit orbit-b"/><div className="game-hero-core"><Gamepad2 size={54}/></div><span className="hero-float float-a">2048</span><span className="hero-float float-b">Aa</span><span className="hero-float float-c">✦</span><span className="hero-float float-d">9×9</span></div>
        <div className="game-library-stats"><div><strong>{GAMES.length}</strong><span>mini-games</span></div><div><strong>{thinking.length}</strong><span>brain games</span></div><div><Grid2X2 size={18}/><span>phone & tablet ready</span></div></div>
      </section>
      <div id="think-and-solve" className="game-library-groups">
        <GameGroupSection title="Think & solve" subtitle="Logic, memory and quick thinking" games={thinking} startIndex={0} icon="brain"/>
        <GameGroupSection title="Quick breaks" subtitle="Easy-to-start games for a little downtime" games={breaks} startIndex={thinking.length} icon="arcade"/>
      </div>
      <p className="game-library-note">Your games run in this browser. No account or download is needed.</p>
    </main>
    <Footer />
  </div>;
}
