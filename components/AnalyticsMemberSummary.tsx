import { Radio, Users, UserCheck } from "lucide-react";

export interface MembershipTotals { total: number; online: number; activeWindowSeconds: number }
const count = (value: number | null | undefined) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString("en-US") : "—";

export default function AnalyticsMemberSummary({ members, onlineVisitors, compact = false }: {
  members?: MembershipTotals | null;
  onlineVisitors?: number | null;
  compact?: boolean;
}) {
  return <section className={"lens-member-summary" + (compact ? " lens-member-summary-compact" : "")} aria-label="Members and online activity">
    <dl>
      <div><Users size={17} aria-hidden="true"/><dt>Total members</dt><dd>{count(members?.total)}</dd></div>
      <div><UserCheck size={17} aria-hidden="true"/><dt>Members online</dt><dd>{count(members?.online)}</dd></div>
      <div><Radio size={17} aria-hidden="true"/><dt>Visitors online</dt><dd>{count(onlineVisitors)}</dd></div>
    </dl>
    <p>Online means activity in the last {Math.round((members?.activeWindowSeconds || 300) / 60)} minutes.</p>
  </section>;
}
