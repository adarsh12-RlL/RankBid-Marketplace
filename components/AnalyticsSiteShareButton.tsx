"use client";

import { useState } from "react";
import { Copy, Share2, X } from "lucide-react";

export default function AnalyticsSiteShareButton({siteId,enabled}:{siteId:string;enabled:boolean}){
  const [open,setOpen]=useState(false),[active,setActive]=useState(enabled),[url,setUrl]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[copied,setCopied]=useState(false);
  async function change(next:boolean){setBusy(true);setError("");try{const response=await fetch(`/api/analytics/sites/${encodeURIComponent(siteId)}/share`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:next})});const data=await response.json();if(!response.ok)throw Error(data.error||"Share setting could not be changed.");setActive(data.enabled);setUrl(data.shareUrl||"");}catch(e:unknown){setError(e instanceof Error?e.message:"Share setting could not be changed.");}finally{setBusy(false);}}
  async function copy(){if(!url)return;try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{setError("Clipboard access failed. Select and copy the link manually.");}}
  return <>
    <button className="rl-secondary" onClick={()=>{setOpen(true);if(active&&!url)void change(true);}}><Share2 size={15}/>Share</button>
    {open&&<div className="rl-share-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><section role="dialog" aria-modal="true" aria-labelledby="rl-share-title" className="rl-share-dialog">
      <button className="rl-share-close" aria-label="Close share dialog" onClick={()=>setOpen(false)}><X size={18}/></button><h2 id="rl-share-title">Share analytics</h2>
      <p>The public link can show aggregate visitor, revenue, and country-level totals. It does not share visitor IDs, raw IP addresses, GPS, cities, or precise locations.</p>
      {!active?<button className="rl-primary" disabled={busy} onClick={()=>void change(true)}>{busy?"Creating link…":"Create public share link"}</button>:<>
        {url?<div className="rl-share-link"><code>{url}</code><button onClick={()=>void copy()} aria-label="Copy share link"><Copy size={16}/></button></div>:<p role="status">{busy?"Loading share link…":"Preparing share link…"}</p>}
        <button className="rl-secondary" disabled={busy} onClick={()=>void change(false)}>Turn off public link</button>
      </>}
      {error&&<p role="alert" className="rl-form-error">{error}</p>}{copied&&<p className="rl-form-hint">Link copied.</p>}
    </section></div>}
  </>;
}
