import {notFound} from "next/navigation";
import Home from "@/app/page";
import {CATEGORIES,categoryToSlug} from "@/lib/utils";
export const dynamic="force-dynamic";
export default async function Category({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{view?:string;search?:string;page?:string}>}){
 const {slug}=await params;const category=CATEGORIES.find(c=>categoryToSlug(c)===slug);if(!category)notFound();
 return Home({searchParams:Promise.resolve({...await searchParams,category})});
}
