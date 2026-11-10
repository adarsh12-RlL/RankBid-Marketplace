import Home from "@/app/page";
export const dynamic="force-dynamic";
export default async function Today({searchParams}:{searchParams:Promise<{category?:string;search?:string;page?:string}>}){return Home({searchParams:Promise.resolve({...await searchParams,view:"today"})});}
