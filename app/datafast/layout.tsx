import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "RankLens Analytics", template: "%s | RankLens" },
  description: "See anonymous website traffic and verified revenue in the RankLens analytics workspace.",
};

export default function RankLensLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
