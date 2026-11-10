import Archive from "@/app/archive/page";
export const dynamic="force-dynamic";
export default async function Daily({searchParams}:{searchParams:Promise<{page?:string}>}){return Archive({searchParams});}
