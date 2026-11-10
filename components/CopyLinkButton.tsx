"use client";
import {useState} from "react";
export default function CopyLinkButton(){
 const [state,setState]=useState<"idle"|"copied"|"failed">("idle");
 async function copy(){try{await navigator.clipboard.writeText(window.location.href);setState("copied");}catch{setState("failed");}}
 return <span className="inline-flex flex-col items-start gap-2"><button type="button" onClick={copy} className="rounded-full border border-[#e6ded7] px-5 py-2 text-xs font-medium hover:border-[#c94e36] dark:border-stone-700">{state==="copied"?"Link copied":"Copy link"}</button><span role="status" className="text-[11px] text-stone-500">{state==="failed"?"Copy the page address from your browser.":""}</span></span>;
}
