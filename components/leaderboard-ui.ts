import { categoryToSlug } from "@/lib/utils";
import { normalizeListingUrl } from "@/lib/listing-identity";
export type FeedBoard = "all_time" | "today";
export interface PublicStats {
  totalRevenue?: number | null; revenue?: number | null;
  totalProducts?: number | null; products?: number | null;
  totalVisitors?: number | null; visitors?: number | null;
  todayVisitors?: number | null; online?: number | null;
  members?: number | null; onlineMembers?: number | null;
  isTest?: boolean; mode?: string; [key: string]: unknown;
}
export function asBoard(value?: string): FeedBoard { return value === "today" ? "today" : "all_time"; }
export function recordedNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}
export function feedHref(board = "all_time", category = "All", search = "", page = 1) {
  const params = new URLSearchParams({ view: asBoard(board) });
  if (search.trim()) params.set("search", search.trim());
  if (Number.isSafeInteger(page) && page > 1) params.set("page", String(page));
  const path = !category || category.toLowerCase() === "all" ? "/" : "/category/" + categoryToSlug(category);
  return path + "?" + params.toString();
}
export interface ClaimPrefill { url?: string; category?: string; targetAmount: number; board?: string; }
export function claimHref({ url = "", category = "", targetAmount, board = "all_time" }: ClaimPrefill) {
  if (!Number.isSafeInteger(targetAmount) || targetAmount < 1 || targetAmount > 999999)
    throw new Error("Choose a whole-dollar target up to $999,999.");
  const params = new URLSearchParams({ board: asBoard(board), price: String(targetAmount) });
  if (url.trim()) params.set("url", normalizeListingUrl(url.trim()).url);
  if (category && category.toLowerCase() !== "all") params.set("category", category);
  return "/submit?" + params.toString();
}
export function utcDate(value?: string): Date | null {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function ageLabel(value?: string) {
  const date = utcDate(value);
  if (!date) return "";
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of [["year",31536000],["month",2592000],["day",86400],["hour",3600],["minute",60]] as const)
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  return "just now";
}

