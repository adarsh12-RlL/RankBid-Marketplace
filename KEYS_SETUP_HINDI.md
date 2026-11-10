# RankBid: keys aur webhook setup

Secret keys, passwords aur OTP chat mein na bhejein. Values sirf apne local `.env.local` mein set karein. Abhi PAYMENT_MODE=gateways aur PAYMENT_ENV=test rakhein. Ek dashboard link API authorisation nahi hota.

## Razorpay

1. Apne Razorpay Dashboard mein Test Mode select karein.
2. Account & Settings -> Website & App Settings -> API Keys -> Generate Key.
3. Key ID ko RAZORPAY_KEY_ID aur Key Secret ko RAZORPAY_KEY_SECRET mein locally set karein. Secret dobara na dikhne par dashboard ka secure reset process use karein.
4. Account & Settings -> Webhooks -> Add New Webhook. Endpoint https://YOUR-PUBLIC-DOMAIN/api/webhooks/razorpay hoga. Localhost ko Razorpay webhook destination mein accept nahi karta; local test ke liye provider-supported public tunnel ya deployed HTTPS staging URL chahiye. Har tunnel domain accepted nahi hota; Razorpay ki current validation/testing list check karein.
5. Webhook ke liye apna alag random secret chunein, aur wahi value RAZORPAY_TEST_WEBHOOK_SECRET mein rakhein. API key secret ko webhook secret samajhkar copy na karein.
6. Events: payment.captured, payment.authorized, order.paid, refund.processed, payment.dispute.created.
7. RAZORPAY_ACCOUNT_ID ko signed webhook payload ke actual account_id (acc_...) se match karna hai. Dashboard Merchant ID ko andaze se prefix laga kar na bharein. Webhook test/request logs mein actual account_id verify karein. Test payload se rank credit nahi milta; server actual captured payment ko API se fetch karta hai.
8. INR checkout ke liye RAZORPAY_CURRENCY=INR aur published placement price RAZORPAY_INR_PAISE_PER_USD set hota hai. Is field ka koi automatic market FX default nahi hai. Customer ko exact charge payment se pehle dikhega. Direct USD orders sirf international USD-enabled merchant ke liye RAZORPAY_CURRENCY=USD aur RAZORPAY_USD_ENABLED=true se allow hote hain.

Official: https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/ aur https://razorpay.com/docs/webhooks/setup-edit-payments/

## Stripe Express

Fixed recipient acct_1UQnIzJc5Boa9I3i hai. Yeh account jis Stripe platform ke under hai, us platform ka authorised server API access chahiye. Kisi doosre account ki key se is Express account par charge nahi banaya jayega.

1. Authorised Stripe platform ke test/sandbox API Keys page se server test secret key locally STRIPE_SECRET_KEY mein set karein.
2. Workbench/Webhooks mein destination banate waqt Connected accounts events select karein. HTTPS endpoint: https://YOUR-PUBLIC-DOMAIN/api/webhooks/stripe.
3. Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, charge.dispute.created, payment_intent.payment_failed.
4. Us destination ke signing secret ko STRIPE_CONNECT_WEBHOOK_SECRET mein set karein. Local test ke liye authorised Stripe CLI mein `stripe listen --forward-connect-to localhost:3000/api/webhooks/stripe` chalayein. CLI jo signing secret dikhaye, local env mein wahi use karein; Dashboard destination ka signing secret alag hota hai.
5. Balance dashboard link se API access, enabled payments ya enabled bank payouts prove nahi hote. Server har checkout se pehle fixed recipient ko Stripe API se verify karta hai.

Official: https://docs.stripe.com/keys aur https://docs.stripe.com/connect/direct-charges aur https://docs.stripe.com/connect/webhooks

## Google login

1. Google Cloud Console mein apna project select/create karein. Google Auth Platform ke Branding, Audience aur consent-screen details complete karein. Testing audience mein apna Google account add karein.
2. Clients/Credentials -> Create OAuth client -> Web application.
3. Local authorised origin: http://localhost:3000 . Redirect URI: http://localhost:3000/api/auth/google/callback . URI exact same honi chahiye.
4. Client ID aur secret ko GOOGLE_CLIENT_ID aur GOOGLE_CLIENT_SECRET mein locally set karein. NEXT_PUBLIC_APP_URL=http://localhost:3000 rakhein.
5. Local launcher strict localhost/loopback ke liye Google ka HTTP exception enable karta hai, isliye optimized local mode mein bhi OAuth settings valid rehti hain. Public production site ke liye HTTPS domain ke saath same callback path register karein.
6. Existing password account ko sirf email match dekhkar Google identity se link nahi kiya jata. Agar link_required aaye, existing account method se sign in karein; owner ko zaroorat ho to local admin setup/reset procedure use karna hoga.

Official: https://developers.google.com/identity/protocols/oauth2/web-server

## Owner admin aur verification

Local terminal mein G:\My Drive\RankBid kholkar `powershell -File scripts/start-local.ps1 -Mode admin` chalaya ja sakta hai. Pehle ADMIN_EMAIL locally set karein. Existing account reset karna ho to explicit ADMIN_RESET_PASSWORD=1 chahiye. Script generated password sirf local console mein ek baar dikhata hai; ise chat mein na bhejein.

Keys bharne ke baad server restart aur pehle test checkout karein. Website browser success message par money received nahi maanta: signed webhook/server payment fetch aur captured/paid state match hona zaroori hai. Live activation se pehle real operator name, support email, public HTTPS URL aur provider activation complete hone chahiye.

Payment captured hone par website verified status aur rank update karti hai. Bank mein settlement Stripe/Razorpay ke apne settlement schedule aur account eligibility ke mutabik hota hai; har payment turant bank deposit nahi hoti. Razorpay payment configured Razorpay merchant mein aur Stripe payment fixed connected Stripe account mein jaati hai.
