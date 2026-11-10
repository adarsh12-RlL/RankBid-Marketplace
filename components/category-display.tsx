import { LayoutGrid, Trophy, Megaphone, Search, ListTodo, Bot, Code2, Bitcoin, Gamepad2, HeartPulse, Briefcase, ShoppingBag, Compass, Plane, Image, Users, GraduationCap, Palette, UserRound, Newspaper, Globe, DollarSign, ShieldCheck, Building2, PenLine, Volume2, BarChart3 } from "lucide-react";
export function categoryDisplay(category: string) {
  const name = category.toLowerCase();
  if (name === "all") return { label: "All", Icon: LayoutGrid };
  const variants = [
    [/leaderboard/, "Leaderboards", Trophy], [/marketing/, "Marketing", Megaphone],
    [/seo|visibility/, "SEO", Search], [/productivity/, "Productivity", ListTodo],
    [/agent/, "Agents", Bot], [/developer/, "Developer", Code2], [/crypto|blockchain/, "Crypto", Bitcoin],
    [/game|entertainment/, "Games", Gamepad2], [/health|fitness/, "Health", HeartPulse],
    [/business|finance|legal/, "Business", Briefcase], [/ecommerce|retail/, "Ecommerce", ShoppingBag],
    [/director/, "Directories", Compass], [/travel|lifestyle/, "Travel", Plane], [/media generation|ai media/, "AI Media", Image],
    [/agenc/, "Agencies", Users], [/social/, "Social", Users], [/education|learning/, "Education", GraduationCap],
    [/design|creative/, "Design", Palette], [/people|profile/, "People", UserRound], [/hiring|career/, "Hiring", Briefcase],
    [/news/, "News", Newspaper], [/domain/, "Domains", Globe], [/sales/, "Sales", DollarSign],
    [/security|privacy/, "Security", ShieldCheck], [/real estate|property/, "Real Estate", Building2],
    [/writing|content/, "Writing", PenLine], [/audio|voice/, "Audio", Volume2], [/analytic/, "Analytics", BarChart3],
  ] as const;
  for (const [match, label, Icon] of variants) if (match.test(name)) return { label, Icon };
  return { label: category || "Other", Icon: LayoutGrid };
}
