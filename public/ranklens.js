(()=>{
  const script=document.currentScript,siteId=script&&script.getAttribute("data-site-id");
  if(!script||!/^rl_[A-Za-z0-9_-]{20,40}$/.test(siteId||"")||window.ranklensOptOut===true)return;
  let api;try{api=new URL("/api/analytics/site-events",script.src);api.searchParams.set("siteId",siteId);}catch{return;}
  const cookieName="rl_vid_"+siteId.replace(/[^A-Za-z0-9_-]/g,"");
  const readCookie=()=>{const item=document.cookie.split("; ").find(part=>part.startsWith(cookieName+"="));return item?decodeURIComponent(item.slice(cookieName.length+1)):"";};
  const randomId=()=>{try{return crypto.randomUUID().replaceAll("-","");}catch{const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}};
  let visitor=readCookie();if(!/^[a-f0-9]{32}$/.test(visitor)){visitor=randomId();document.cookie=cookieName+"="+visitor+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");}
  const sessionKey="rl_sid_"+siteId;let session="";try{session=sessionStorage.getItem(sessionKey)||"";}catch{}
  if(!/^[a-f0-9]{32}$/.test(session)){session=randomId();try{sessionStorage.setItem(sessionKey,session);}catch{}}
  const safePath=()=>location.pathname.slice(0,256)||"/";
  let campaign="";try{campaign=(new URLSearchParams(location.search).get("utm_campaign")||"").slice(0,100);}catch{}
  let referrer="";try{const ref=new URL(document.referrer);if(["http:","https:"].includes(ref.protocol)&&ref.origin!==location.origin)referrer=ref.origin;}catch{}
  let eventId=0,activeMs=0,activeSince=document.visibilityState==="visible"?performance.now():null;
  const duration=()=>Math.max(0,Math.floor(activeMs+(activeSince===null?0:performance.now()-activeSince)));
  const send=(body,beacon=false)=>{
    const json=JSON.stringify(body);
    if(beacon){try{if(navigator.sendBeacon(api.href,new Blob([json],{type:"text/plain"})))return Promise.resolve();}catch{}}
    try{return fetch(api.href,{method:"POST",mode:"cors",credentials:"omit",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:json,keepalive:true}).catch(()=>{});}catch{return Promise.resolve();}
  };
  const pageview=()=>send({type:"pageview",visitor,session,path:safePath(),referrer,campaign}).then(async response=>{if(response&&response.ok){try{const data=await response.json();if(Number.isSafeInteger(data.eventId))eventId=data.eventId;}catch{}}});
  const ping=(force=false)=>{if(eventId&&(force||document.visibilityState==="visible"))void send({type:"heartbeat",visitor,session,eventId,duration:duration()},force);};
  void pageview();
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){if(activeSince!==null)activeMs+=performance.now()-activeSince;activeSince=null;ping(true);}else if(activeSince===null){activeSince=performance.now();ping();}});
  const heartbeat=setInterval(()=>ping(),30000);
  const sendExit=event=>{const target=event.target instanceof Element?event.target:null,anchor=target&&target.closest("a[href]");if(!anchor)return;try{const dest=new URL(anchor.href,location.href);if(["http:","https:"].includes(dest.protocol)&&dest.origin!==location.origin)void send({type:"exit",visitor,session,path:safePath(),url:dest.origin},true);}catch{}};
  document.addEventListener("click",sendExit);document.addEventListener("auxclick",sendExit);
  window.addEventListener("pagehide",()=>{ping(true);clearInterval(heartbeat);});
})();
