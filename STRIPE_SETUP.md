# RankBid Stripe setup

Recipient: `acct_1UQnIzJc5Boa9I3i`. Checkout hamesha isi connected account ke scope mein direct charge banata hai. Client kisi doosre account ko select nahi kar sakta.

Abhi Express dashboard link sirf account reference hai. Live connection ka proof nahi. Isi Express account ko manage karne wale platform ki authorized API key chahiye. Kisi doosre platform ki Express account ko sirf account ID se nayi website mein attach nahi kar sakte.

1. `.env.example` ko `.env.local` mein copy karein. `NEXT_PUBLIC_APP_URL`, authorized `STRIPE_SECRET_KEY`, asli operator name aur support email locally set karein. Secret keys chat, screenshot ya public form mein na daalein.
2. Usi Stripe platform mein Connected accounts webhook destination banayein: `https://YOUR-DOMAIN/api/webhooks/stripe`. Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, charge.dispute.created, payment_intent.payment_failed. Is destination ka signing secret `STRIPE_CONNECT_WEBHOOK_SECRET` mein set karein. Localhost ke liye Stripe CLI forwarding chahiye; production ko public HTTPS URL chahiye.
3. Server restart karein. Admin settings mein Stripe readiness check karein. Checkout se pehle har baar fixed account ka API access, onboarding, card capability aur payout status verify hota hai.
4. Pehle test mode mein checkout aur signed webhook verify karein. Real live test owner ki explicit payment action se hi karein. Website live payment ko tabhi received maanta hai jab signed webhook ka account, test/live mode, session aur USD amount order se match kare.

USD ranking currency hai. Local INR presentment sirf Stripe ki eligibility aur customer checkout par depend karti hai. Actual currency/amount signed receipt se store hota hai. Fixed FX rate nahi lagta. Funds pehle connected Stripe balance mein jaate hain; fees aur bank payout timing Stripe account settings ke mutabik hoti hai.

Agar isi account ka authorized platform access uplabdh nahi hai, checkout blocked rahega. Koi doosra recipient, platform balance fallback, fake success ya simulated live payment nahi banaya jayega.

Google login ke liye alag GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET aur exact callback `/api/auth/google/callback` configure karna hota hai. Email/password account bina Google credentials ke bhi kaam karta hai.

## Customer choice: Stripe + Razorpay

Checkout mein customer gateway khud chunta hai. Stripe fixed Express account ka direct charge banata hai. Razorpay authenticated merchant account ki API key se order banata hai. Razorpay payment Stripe balance mein automatically transfer nahi hoti; dono providers apni settlement settings se bank mein payout karte hain.

Razorpay dashboard ka generic URL merchant account ID ya API authorization nahi hota. Usi merchant dashboard se local server ke liye `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, actual `RAZORPAY_ACCOUNT_ID` aur webhook signing secret configure karein. Public endpoint `/api/webhooks/razorpay` hai. Events: payment.captured, payment.authorized, order.paid, refund.processed, payment.dispute.created. Test/live webhook secrets alag rakhein.

`PAYMENT_MODE=gateways` aur pehle `PAYMENT_ENV=test` use karein. Dono gateway keys isi environment ki honi chahiye. Live ke liye public HTTPS app URL, activated merchant, real operator/support details aur successful test verification zaroori hain.

Leaderboard spend USD mein hai. Razorpay INR checkout ke liye site owner ka explicit published price unit `RAZORPAY_INR_PAISE_PER_USD` set hota hai (ek USD ranking spend ki INR price, paise mein). Koi default ya guessed market FX nahi hai. Exact INR charge customer ko payment se pehle dikhai jati hai. Alternative direct USD order sirf account mein international USD activation ke baad `RAZORPAY_CURRENCY=USD`, `RAZORPAY_USD_ENABLED=true` ke saath use karein.

Razorpay Checkout success signature verify karna akela captured payment ka proof nahi. Server authenticated API se payment fetch karta hai, order/merchant/mode/amount/currency match karta hai aur captured status ke baad hi rank credit karta hai. Refunds proportionally ranking spend reduce karte hain; disputes rank se hold hote hain. Ek pending checkout ko gateway switch karke dobara charge create nahi kiya jata.
