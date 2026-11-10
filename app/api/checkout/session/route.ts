import crypto from 'node:crypto';

import Stripe from 'stripe';

import {NextRequest,NextResponse} from 'next/server';

import getDb from '@/lib/db';

import {getUser,sameOrigin,limited} from '@/lib/auth';

import {quote,getPaymentMode,isTestMode} from '@/lib/ranking';

import {CATEGORIES} from '@/lib/utils';

import {validatePublicUrl} from '@/lib/metadata';

import {normalizeListingUrl} from '@/lib/listing-identity';

import {createStripeConnectClient,verifyStripeConnectRecipient,FIXED_STRIPE_RECIPIENT_ID} from '@/lib/stripe-connect';

import {openStripeOrder} from '@/lib/stripe-order';
import {getRazorpayConfig,createRazorpayClient,createOrRecoverRazorpayOrder} from '@/lib/razorpay';
import {razorpayCharge} from '@/lib/checkout-pricing';
import {addAnalyticsPlacementMarkup,getAnalyticsPlacementMarkup} from '@/lib/analytics-plan';

export const dynamic='force-dynamic';

class CheckoutError extends Error{}

export async function POST(req:NextRequest){

 const user=getUser(req);if(!user)return NextResponse.json({error:'Please sign in before submitting a product'},{status:401});

 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});

 if(limited(req,'checkout',20))return NextResponse.json({error:'Too many checkout attempts'},{status:429});

 const mode=getPaymentMode();if(mode==='disabled')return NextResponse.json({error:'Payments are not configured. The owner must complete the selected Stripe Connect setup.'},{status:503});

 if(mode==='live'&&(!process.env.OPERATOR_NAME?.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL||'')))return NextResponse.json({error:'The owner must configure operator identity and support details before accepting live payments.'},{status:503});

 let order:any,product:any;

 try{

 const b=await req.json();if(b.gateway!==undefined&&!['stripe','razorpay','sandbox'].includes(b.gateway))throw new CheckoutError('Choose a supported payment gateway');
 const gateway=mode==='sandbox'?'sandbox':b.gateway==='razorpay'?'razorpay':'stripe';if(b.gateway==='sandbox'&&mode!=='sandbox')throw new CheckoutError('Sandbox is not enabled');
 if(b.acceptedTerms!==true||b.authorized!==true)throw new CheckoutError('Confirm authorization and accept the placement terms');

 if(b.targetBoard!==undefined&&!['today','all_time'].includes(b.targetBoard))throw new CheckoutError('Invalid board');

 const board=b.targetBoard==='today'?'today':'all_time';const target=b.targetAmountCents;

 if(typeof target!=='number'||!Number.isSafeInteger(target)||target%100||target<100||target>99999900)throw new CheckoutError('Enter a whole-dollar target up to $999,999');

 const appOrigin=new URL(process.env.NEXT_PUBLIC_APP_URL||req.url).origin;

 if(mode==='live'&&!appOrigin.startsWith('https://'))throw new CheckoutError('Live checkout requires the configured HTTPS website URL');

 let identity:ReturnType<typeof normalizeListingUrl>|undefined;

 if(!b.productId&&!b.listingId){identity=normalizeListingUrl(String(b.url||''));await validatePublicUrl(identity.url);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||typeof b.description!=='string'||b.description.length>500||!CATEGORIES.includes(b.category)||b.category==='All')throw new CheckoutError('Enter a valid product name, description and category');}

 const razorpayConfig=gateway==='razorpay'?getRazorpayConfig(process.env,mode!=='live'):null;
 if(gateway==='razorpay'&&(!razorpayConfig||!razorpayConfig.webhookSecret))throw new CheckoutError('The owner must complete Razorpay credentials and its webhook setup.');
 const razorpayClient=razorpayConfig?createRazorpayClient(razorpayConfig):null;
 const connection=gateway!=='stripe'?undefined:createStripeConnectClient(process.env.STRIPE_SECRET_KEY,mode==='live'?'live':'stripe_test',key=>new Stripe(key));

 const readiness=connection?await verifyStripeConnectRecipient({connection,adaptivePricingEnabled:process.env.STRIPE_ADAPTIVE_PRICING==='true'}):undefined;

 const db=getDb();db.exec('BEGIN IMMEDIATE');

 try{

 const now=new Date().toISOString();db.prepare("UPDATE payments SET status='expired' WHERE status='pending' AND provider='sandbox' AND checkout_expires_at<?").run(now);

 if(b.productId||b.listingId){product=db.prepare('SELECT * FROM products WHERE id=?').get(Number(b.productId||b.listingId));if(!product||(product.owner_id!==user.id&&user.role!=='admin'))throw new CheckoutError('This product does not belong to your account');}

 else{product=db.prepare('SELECT * FROM products WHERE (listing_key=? OR (listing_key IS NULL AND domain=? AND url=?)) AND is_demo=? AND owner_id IS NOT NULL').get(identity!.key,identity!.domain,identity!.url,isTestMode()?1:0);if(product&&product.owner_id!==user.id)throw new CheckoutError('This listing belongs to another account. Contact support.');if(!product){quote(undefined,target,board,b.category);const result=db.prepare("INSERT INTO products(name,description,url,domain,category,favicon_url,owner_id,is_demo,is_approved,submitter_email,listing_key,review_state) VALUES(?,?,?,?,?,?,?,?,0,?,?,'awaiting_payment')").run(b.name.trim(),b.description.trim(),identity!.url,identity!.domain,b.category,'',user.id,isTestMode()?1:0,user.email,identity!.key);product=db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid);}}

 if(!product.is_active)throw new CheckoutError('This listing is hidden. Contact support.');if(product.is_demo!==(isTestMode()?1:0))throw new CheckoutError('Test and live listings must be separate');

 const baseQuote=quote(product.id,target,board,product.category);
 const q={...baseQuote,baseAmountCents:baseQuote.amountCents,markupPercent:0,amountCents:baseQuote.amountCents};

 const pending=db.prepare("SELECT * FROM payments WHERE product_id=? AND status='pending'").get(product.id) as any;

 if(pending){const scoped=mode==='sandbox'?pending.provider==='sandbox'&&pending.is_test===1:gateway==='razorpay'?pending.provider==='razorpay'&&pending.razorpay_account_id===razorpayConfig!.accountId&&pending.is_test===(mode==='live'?0:1)&&['inr','usd'].includes(pending.charge_currency)&&Number.isSafeInteger(pending.charge_amount)&&pending.charge_amount>0:pending.provider==='stripe'&&pending.stripe_account_id===FIXED_STRIPE_RECIPIENT_ID&&pending.is_test===(mode==='live'?0:1)&&pending.charge_currency==='usd'&&pending.charge_amount===pending.amount_cents;

 if(!scoped)throw new CheckoutError('A previous checkout is not bound to this recipient. Contact support to reconcile it before paying again.');

 if(pending.user_id!==user.id||pending.target_amount_cents!==target||pending.target_board!==board)throw new CheckoutError('An active checkout already exists for this listing. Complete it before changing the target.');

 if(pending.provider==='stripe'&&pending.checkout_expires_at<=now)throw new CheckoutError('The previous provider checkout awaits authoritative verification. Contact support before paying again.');

 if(!pending.checkout_url&&mode!=='sandbox'&&!pending.provider_request)throw new CheckoutError('The previous checkout needs reconciliation. Contact support before paying again.');order=pending;

 }else{const charge=gateway==='razorpay'?razorpayCharge(q.amountCents,razorpayConfig!):{currency:'USD',amount:q.amountCents};const expires=new Date(Date.now()+(mode==='sandbox'?1800000:3600000)).toISOString();const result=db.prepare("INSERT INTO payments(product_id,amount,amount_cents,user_id,provider,is_test,idempotency_key,target_board,target_amount_cents,checkout_expires_at,payment_method,stripe_account_id,charge_currency,charge_amount,visitor_id,razorpay_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(product.id,q.amountCents/100,q.amountCents,user.id,gateway,isTestMode()?1:0,crypto.randomUUID(),board,target,expires,mode,gateway==='stripe'?FIXED_STRIPE_RECIPIENT_ID:null,charge.currency.toLowerCase(),charge.amount,req.cookies.get('rankbid_visitor')?.value?.match(/^[a-f0-9]{32}$/)?.[0]||null,razorpayConfig?.accountId||null);order=db.prepare('SELECT * FROM payments WHERE id=?').get(result.lastInsertRowid);

 if(gateway==='razorpay'){const payload={amount:charge.amount,currency:charge.currency,receipt:`rankbid_${order.id}_${order.idempotency_key.replaceAll('-','').slice(0,12)}`,notes:{internal_payment_id:String(order.id)}};order.provider_request=JSON.stringify(payload);db.prepare('UPDATE payments SET provider_request=? WHERE id=?').run(order.provider_request,order.id);}
 else if(mode!=='sandbox'){const params={mode:'payment',billing_address_collection:'required',name_collection:{individual:{enabled:true}},adaptive_pricing:{enabled:readiness!.adaptivePricingAllowed},client_reference_id:String(order.id),metadata:{payment_id:String(order.id)},payment_intent_data:{metadata:{payment_id:String(order.id)}},line_items:[{price_data:{currency:'usd',unit_amount:q.amountCents,product_data:{name:`RankBid placement: ${product.name}`,description:'Advertising placement on the RankBid leaderboard'}},quantity:1}],success_url:appOrigin+'/checkout/success?payment_id='+order.id,cancel_url:appOrigin+'/checkout/cancel?payment_id='+order.id,expires_at:Math.floor(new Date(expires).getTime()/1000)};order.provider_request=JSON.stringify(params);db.prepare('UPDATE payments SET provider_request=? WHERE id=?').run(order.provider_request,order.id);}}

 db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}

 if(order.checkout_url)return NextResponse.json({paymentId:String(order.id),url:order.checkout_url,checkoutUrl:order.checkout_url,amountCents:order.amount_cents});

 let url:string;

 if(mode==='sandbox')url='/sandbox/checkout?payment_id='+order.id;

 else if(gateway==='razorpay'){const claimed=db.prepare('UPDATE payments SET provider_create_started_at=? WHERE id=? AND provider_create_started_at IS NULL').run(new Date().toISOString(),order.id).changes===1;const providerId=await createOrRecoverRazorpayOrder(JSON.parse(order.provider_request),razorpayClient!,{allowCreate:claimed});url='/razorpay/checkout?payment_id='+order.id;db.prepare('UPDATE payments SET provider_payment_id=?,checkout_url=? WHERE id=?').run(providerId,url,order.id);}
 else {const session=await openStripeOrder(order,connection!,readiness!);url=session.url;db.prepare('UPDATE payments SET provider_payment_id=?,checkout_url=? WHERE id=?').run(session.id,url,order.id);}

 if(mode==='sandbox')db.prepare('UPDATE payments SET checkout_url=? WHERE id=?').run(url,order.id);

 return NextResponse.json({paymentId:String(order.id),url,checkoutUrl:url,amountCents:order.amount_cents});

 }catch(e:any){

 // A provider timeout can happen after Stripe created the session. Keep the same

 // reserved order, request and idempotency key for recovery; never create a new charge.

 const known=e instanceof CheckoutError||(!order&&e?.name==='Error'&&/target|placement|minimum|increase|whole|category|public|URL|address|rank/i.test(e.message));

 return NextResponse.json({error:known?e.message:order?'The payment gateway has not confirmed this checkout yet. Retry the same request; your order is preserved.':'The selected payment gateway is not ready. The owner must complete its authorised account and currency setup.'},{status:known?400:503});

 }

}

