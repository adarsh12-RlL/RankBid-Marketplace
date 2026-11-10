import {NextRequest,NextResponse} from "next/server";
import Stripe from "stripe";
import {isAdmin} from "@/lib/auth";
import {getPaymentMode} from "@/lib/ranking";
import {createStripeConnectClient,verifyStripeConnectRecipient,FIXED_STRIPE_RECIPIENT_ID} from "@/lib/stripe-connect";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){if(!isAdmin(req))return NextResponse.json({error:"Admin access required"},{status:403});const mode=getPaymentMode();const base={accountId:FIXED_STRIPE_RECIPIENT_ID,mode,keyConfigured:!!process.env.STRIPE_SECRET_KEY,webhookConfigured:!!(process.env.STRIPE_CONNECT_WEBHOOK_SECRET||process.env.STRIPE_WEBHOOK_SECRET)};if(mode!=="live"&&mode!=="stripe_test")return NextResponse.json({...base,ready:false,state:"missing_configuration"});try{const connection=createStripeConnectClient(process.env.STRIPE_SECRET_KEY,mode,key=>new Stripe(key));const result=await verifyStripeConnectRecipient({connection,adaptivePricingEnabled:process.env.STRIPE_ADAPTIVE_PRICING==="true"});return NextResponse.json({...base,ready:true,readiness:result},{headers:{"Cache-Control":"no-store"}});}catch(e:any){return NextResponse.json({...base,ready:false,state:e.code||"unverified",error:e.message},{headers:{"Cache-Control":"no-store"}});}}
