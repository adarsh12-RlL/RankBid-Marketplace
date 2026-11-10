# RankLens country-level analytics setup

RankLens country map sirf aggregate country counts dikhata hai. Browser GPS, city,
region, postal code aur precise coordinates collect nahi hote. Raw IP analytics
database mein kabhi save nahi hota. Provider country code na de to report mein
Unknown aata hai.

## Trusted proxy configuration

Country code tabhi read hota hai jab owner ANALYTICS_GEO_PROVIDER set kare:

- Cloudflare ke peeche app ke liye ANALYTICS_GEO_PROVIDER=cloudflare
- Vercel hosting ke liye ANALYTICS_GEO_PROVIDER=vercel

Yeh setting sirf tab use karein jab requests wahi trusted provider se aati hon aur
origin ko seedha internet se access na kiya ja sake. Cloudflare mode mein app
CF-IPCountry ko tabhi maanta hai jab CF-Ray bhi present ho. Vercel mode
x-vercel-ip-country header ko padhta hai. Kisi bhi mode mein raw IP code ke
andar nahi padha ya analytics event mein store kiya jata.

Setting ko .env.local ya hosting ke private environment settings mein rakhein,
phir server restart/redeploy karein. .env.example mein value blank chhodi gayi
hai. Localhost par trusted proxy na hone ki wajah se country Unknown hi rahega.

Analytics events mein country ke alawa region/city columns ko Unknown rakha
jata hai. Purane granular location values one-time migration se clear hote hain.
Public share links country totals aur paths jaise aggregate report data dikhate
hain; visitor IDs aur raw IPs nahi. Visitor-facing privacy notice ko apni live
website par bhi update karein.
