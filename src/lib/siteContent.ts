import { prisma, withDatabase } from "@/lib/db";

export type SiteHeroSlide = { eyebrow:string; heading:string; accent:string; body:string; cta1Label:string; cta1Href:string; cta2Label:string; cta2Href:string; stat1Value:string; stat1Label:string; stat2Value:string; stat2Label:string; stat3Value:string; stat3Label:string; imageUrl:string; backgroundImageUrl:string };
export type CmsBlock = { icon:string; title:string; subtitle:string; body:string; imageUrl:string; linkLabel:string; linkHref:string; blockType:string; width:string; align:string; background:string; animation:string };
export type CmsStep = { number:string; title:string; body:string; imageUrl:string };
export type CmsPage = { eyebrow:string; heading:string; accent:string; body:string; backgroundImageUrl:string; heroImageUrl:string; primaryLabel:string; primaryHref:string; secondaryLabel:string; secondaryHref:string; sectionEyebrow:string; sectionHeading:string; sectionBody:string; blocks:CmsBlock[]; steps:CmsStep[]; ctaHeading:string; ctaBody:string; ctaPrimaryLabel:string; ctaPrimaryHref:string; ctaSecondaryLabel:string; ctaSecondaryHref:string; sectionOrder:string[]; quoteImageUrl:string; quoteName:string; quoteDesignation:string; quoteText:string; proofPoints:string[] };
export type FaqItem = { question:string; answer:string };
export type CmsTextStyle = { fontSize?:string; fontFamily?:string; fontWeight?:string; italic?:boolean; colour?:string };
export type VisualWidget = { id:string; type:string; title?:string; subtitle?:string; body?:string; text?:string; textKind?:"heading"|"subheading"|"paragraph"|"caption"; icon?:string; imageUrl?:string; videoUrl?:string; thumbnailUrl?:string; caption?:string; url?:string; linkLabel?:string; promoCode?:string; copyCodeEnabled?:boolean; openInNewTab?:boolean; buttonStyle?:"primary"|"secondary"|"outline"; autoplay?:boolean; muted?:boolean; loop?:boolean; width?:string; align?:"left"|"center"|"right"; height?:number; thickness?:number; colour?:string; background?:string; marginTop?:number; marginBottom?:number; columns?:number; sectionVariant?:"plain"|"soft"|"dark"|"accent"; visible?:boolean; fontSize?:string; fontFamily?:string; fontWeight?:string; italic?:boolean; textColour?:string };
export type FaqGroup = { key:string; label:string; items:FaqItem[] };
export type PolicyPageContent = { eyebrow:string; heading:string; lastUpdated:string; body:string; footer:string };
export type SiteContent = {
  hiddenSections?: Record<string, string[]>;
  visualWidgets?: Record<string, VisualWidget[]>;
  textStyles?: Record<string, CmsTextStyle>;
  policies: { terms:PolicyPageContent; privacy:PolicyPageContent; returns:PolicyPageContent; warranty:PolicyPageContent; payment:PolicyPageContent };
  heroSlides: SiteHeroSlide[];
  trust: { eyebrow:string; heading:string; accent:string; clients:string[]; backgroundImageUrl:string };
  finalCta: { eyebrow:string; heading:string; body:string; primaryLabel:string; primaryHref:string; secondaryLabel:string; secondaryHref:string; tertiaryLabel:string; tertiaryHref:string; backgroundImageUrl:string };
  contact: { salesEmail:string; infoEmail:string; phone:string; location:string; whatsapp:string; businessHours:string; mapEmbedUrl:string };
  footer: { description:string; backgroundImageUrl:string };
  pages: { home:CmsPage; repair:CmsPage; assetRecovery:CmsPage; about:CmsPage; contact:CmsPage };
  faq: { eyebrow:string; heading:string; body:string; backgroundImageUrl:string; groups:FaqGroup[]; previewItems:FaqItem[]; ctaHeading:string; ctaBody:string; ctaLabel:string; ctaHref:string };
};
export const SITE_CONTENT_KEY = "site.content.v1";
const block=(icon:string,title:string,subtitle:string,body:string,linkLabel="",linkHref=""):CmsBlock=>({icon,title,subtitle,body,imageUrl:"",linkLabel,linkHref,blockType:"icon",width:"quarter",align:"left",background:"white",animation:"none"});
const step=(number:string,title:string,body:string):CmsStep=>({number,title,body,imageUrl:""});
const page=(p:Partial<CmsPage>):CmsPage=>({ eyebrow:"",heading:"",accent:"",body:"",backgroundImageUrl:"",heroImageUrl:"",primaryLabel:"",primaryHref:"#",secondaryLabel:"",secondaryHref:"#",sectionEyebrow:"",sectionHeading:"",sectionBody:"",blocks:[],steps:[],ctaHeading:"",ctaBody:"",ctaPrimaryLabel:"",ctaPrimaryHref:"#",ctaSecondaryLabel:"",ctaSecondaryHref:"#",sectionOrder:["hero","contactBar","content","process","formOrCta"],quoteImageUrl:"/images/about/industrial-supply-desk.svg",quoteName:"Combay Team",quoteDesignation:"Industrial equipment supply, repair and asset recovery",quoteText:"Combay was built for maintenance and procurement teams who need practical answers: is the item available, what condition is it in, can it be repaired, and how quickly can it move?",proofPoints:["Tested stock","Warranty-backed supply","Repair-led asset recovery"],...p });
export const defaultSiteContent: SiteContent = {
  hiddenSections: {},
  visualWidgets: {},
  textStyles: {},
  policies: {
    payment: { eyebrow:"Policies", heading:"Payment Policy", lastUpdated:"January 2025", body:"100% payment is required in advance prior to dispatch on all orders. Accepted methods: bank transfer (BACS/CHAPS), credit/debit card, PayPal (where available), and cash (in-person collection only). Credit accounts are available to businesses with a proven purchasing history. Contact info@combay.co.uk to apply.", footer:"For the full policy or questions, contact us at info@combay.co.uk." },
    privacy: { eyebrow:"Policies", heading:"Privacy Policy", lastUpdated:"January 2025", body:"We collect only the data necessary to process your order and provide our services. This includes name, email, phone, company, and delivery address. We do not sell your data to third parties. You may request deletion or access to your data by emailing info@combay.co.uk. We comply with UK GDPR.", footer:"For the full policy or questions, contact us at info@combay.co.uk." },
    returns: { eyebrow:"Policies", heading:"Returns Policy", lastUpdated:"January 2025", body:"We offer a 30-day return to base guarantee on all purchases. To request a return, log in to your Customer Portal and click 'Request a Return' within 30 days of delivery. We issue a return label within 24–48 hours. Refunds are processed within 5–7 working days of receiving the return.", footer:"For the full policy or questions, contact us at info@combay.co.uk." },
    terms: { eyebrow:"Policies", heading:"Terms & Conditions", lastUpdated:"January 2025", body:"These terms govern your use of Combay's website and services. By placing an order, you agree to be bound by these terms. Combay Ltd is registered in England and Wales. All orders require 100% payment in advance. Items carry a 30-day warranty. Disputes are subject to English law.", footer:"For the full policy or questions, contact us at info@combay.co.uk." },
    warranty: { eyebrow:"Policies", heading:"Warranty Policy", lastUpdated:"January 2025", body:"All items sold carry a 30-day return to base warranty. Repaired items carry a 60-day checking warranty. Warranty covers faults arising during normal use. It does not cover customer-induced damage (CID), physical damage after delivery, or items listed as For Parts. Optional 2-year extended warranty available at +40% of item value.", footer:"For the full policy or questions, contact us at info@combay.co.uk." }
  },
  heroSlides:[
    {eyebrow:"10,000+ Items In Stock",heading:"Industrial equipment supply,",accent:"without the downtime.",body:"Tested PLCs, HMIs, drives, lab instruments, test equipment and commercial stock supplied by a UK team that understands maintenance pressure.",cta1Label:"Browse Equipment",cta1Href:"/shop",cta2Label:"View Categories",cta2Href:"/shop",stat1Value:"10K+",stat1Label:"Stock items",stat2Value:"30d",stat2Label:"Warranty",stat3Value:"48h",stat3Label:"Typical dispatch",imageUrl:"",backgroundImageUrl:"/images/hero/industrial-automation-bg.svg"},
    {eyebrow:"Repair Service",heading:"Repair before replace,",accent:"wherever possible.",body:"Practical repair, calibration and servicing support for engineering teams trying to keep older production, laboratory and site equipment running.",cta1Label:"Book a Repair",cta1Href:"/repair",cta2Label:"How It Works",cta2Href:"/repair#how",stat1Value:"40%",stat1Label:"Below OEM target",stat2Value:"60d",stat2Label:"Checking warranty",stat3Value:"Free",stat3Label:"Collection options",imageUrl:"",backgroundImageUrl:"/images/hero/industrial-automation-bg.svg"},
    {eyebrow:"Asset Recovery",heading:"Surplus equipment,",accent:"converted into cash.",body:"Clear warehouses, labs and engineering stores with fair-value purchasing, free collection and payment before equipment leaves your site.",cta1Label:"Sell Your Stock",cta1Href:"/asset-recovery",cta2Label:"Recovery Process",cta2Href:"/asset-recovery#how",stat1Value:"24h",stat1Label:"Response",stat2Value:"Free",stat2Label:"Collection",stat3Value:"Paid",stat3Label:"Before removal",imageUrl:"",backgroundImageUrl:"/images/hero/industrial-automation-bg.svg"}
  ],
  trust:{eyebrow:"Why Businesses Use Combay",heading:"Built by engineers,",accent:"for engineers.",clients:["Nutrein","AG Solutions","Fiber Logic","Poole IT","Transend (UK) Ltd"],backgroundImageUrl:"linear-gradient(135deg,#FFFFFF 0%,#F8FAFC 64%,#F7E7C5 100%)"},
  finalCta:{eyebrow:"Get Started Today",heading:"Ready to keep things running?",body:"Whether you need equipment, a repair, or want to recover cash on surplus stock — Combay responds within 24 hours.",primaryLabel:"Browse Stock →",primaryHref:"/shop",secondaryLabel:"Book a Repair",secondaryHref:"/repair",tertiaryLabel:"Sell Your Stock",tertiaryHref:"/asset-recovery",backgroundImageUrl:""},
  contact:{salesEmail:"sales@combay.co.uk",infoEmail:"info@combay.co.uk",phone:"+44 7340 383334",location:"Chelmsford, Essex, UK",whatsapp:"447340383334",businessHours:"Monday–Friday: 9:00am–5:30pm GMT. Enquiries outside hours are answered the next working day.",mapEmbedUrl:"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d79876.47!2d0.4736!3d51.7343!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8945a6c3d53ad%3A0xe3a6e3d6c09c82d9!2sChelmsford%2C%20UK!5e0!3m2!1sen!2suk!4v1"},
  footer:{description:"UK-based industrial and commercial equipment specialists. Buy, repair, or sell surplus stock — backed by engineers.",backgroundImageUrl:""},
  pages:{
    home:page({eyebrow:"What We Do",heading:"Everything you need to keep",accent:"things running.",body:"Buy, repair and sell industrial equipment through one procurement-friendly platform.",sectionEyebrow:"Homepage services",sectionHeading:"Service tabs",sectionBody:"Edit the service cards shown on the homepage.",blocks:[block("🛒","Replace or Buy Equipment","Buy tested stock","Buy affordable and reliable equipment to keep operations running.","Browse Categories","/shop"),block("🔧","Repair Your Goods","Engineering support","Free collection, 60-day checking warranty and competitive repair quotes.","Book a Repair","/repair"),block("💷","Sell Your Unwanted Goods","Asset recovery","Recover cash on surplus stock with free collection and fair value.","Sell to Combay","/asset-recovery")]}),
    repair:page({eyebrow:"Repair Services",heading:"Don't replace —",accent:"repair instead.",body:"Our engineers repair, calibrate, and service industrial and commercial equipment at up to 40% below manufacturer cost.",primaryLabel:"Get a Free Quote →",primaryHref:"#request",secondaryLabel:"Call Us",secondaryHref:"tel:+447340383334",sectionEyebrow:"Our Services",sectionHeading:"What we repair & service.",sectionBody:"Repair, calibration, installation and preventative maintenance for critical industrial equipment.",blocks:[block("🔧","Component Repair","Board-level diagnostics","Board-level repair of PLCs, drives, HMIs, test instruments and scientific equipment."),block("📐","Calibration","Traceable testing","Calibration to manufacturer specification with traceability certificates."),block("🔩","Installation & Setup","On-site commissioning","On-site commissioning of new or refurbished equipment."),block("🛡","Preventative Maintenance","Scheduled PPM","Scheduled visits to reduce breakdowns and extend asset life.")],steps:[step("01","Submit a request","Fill in the form or email sales@combay.co.uk."),step("02","Receive a quote","We send a detailed quote within 48 hours."),step("03","Free collection","Our courier collects from your site."),step("04","Repair and test","Every repaired unit is tested before return.")],ctaHeading:"Request a repair quote.",ctaBody:"No obligation. We respond within 48 hours. Collection is always free."}),
    assetRecovery:page({eyebrow:"Asset Recovery Program",heading:"Recover cash on your",accent:"unwanted equipment.",body:"Fair value for surplus stock. Free collection. Payment before goods leave your site.",primaryLabel:"Start Recovery Request →",primaryHref:"#request",secondaryLabel:"Email sales",secondaryHref:"mailto:sales@combay.co.uk",sectionEyebrow:"How It Works",sectionHeading:"It's that simple.",sectionBody:"We collect from warehouses, offices, and homes — any location, any quantity.",blocks:[block("📦","Single items","One-off disposal","Send photos and we can quote for single machines, instruments or controls."),block("🏭","Warehouse clearances","Bulk stock","We review mixed stock, surplus parts and warehouse clearances."),block("🔁","Trade-in","Offset against purchases","Use asset value as credit against your next Combay purchase."),block("🚚","Free collection","UK collection","We collect from your site around your operation.")],steps:[step("01","Send a disposal request","Send a stock list or a few photos."),step("02","We visit & quote","We arrange a visit if needed and send a fair value quote."),step("03","We collect — free","Same day or as preferred."),step("04","You get paid","Payment before goods leave your site.")],ctaHeading:"Start your recovery request.",ctaBody:"Upload a stock list or send a few photos. We will respond quickly."}),
    about:page({eyebrow:"About Combay",heading:"Engineer founded.",accent:"Operationally focused.",body:"Combay was built by engineers who understand what happens when critical equipment stops running. We built the platform we always wished existed when dealing with equipment sourcing, repair, and disposal.",primaryLabel:"Browse Stock →",primaryHref:"/shop",secondaryLabel:"Contact Us",secondaryHref:"/contact",sectionEyebrow:"Built to solve a real problem",sectionHeading:"Industrial equipment decisions need practical proof, not sales theatre.",sectionBody:"When a production line, lab or site system goes down, buyers need more than a catalogue page. They need clear condition details, tested availability, warranty terms and a practical route when replacement is not the best answer.\n\nCombay was built to connect stock supply, repair and asset recovery into one pragmatic route for maintenance teams, procurement buyers and surplus stock sellers.",proofPoints:["Tested stock","Warranty-backed supply","Repair-led asset recovery"],blocks:[block("~10,000","Items in Stock","Across all industries","Stock across industrial automation, electrical, scientific/lab, AV/broadcast, IT/networking and related categories."),block("30 Days","Warranty","On every item sold","Every item sold carries a 30-day return-to-base warranty unless clearly stated otherwise."),block("60 Days","Repair Warranty","Checking warranty","Repaired items carry a 60-day checking warranty after return."),block("40%","Lower Repair Cost","Compared with OEM quotes","Repair quotes are targeted around 40% below manufacturer repair pricing where achievable."),block("🛒","Buy Equipment","Tested stock","Source tested industrial and commercial equipment across all categories.","Browse Stock","/shop"),block("🔧","Repair Equipment","Engineering support","Cost-effective repair service with free collection and warranty.","Book a Repair","/repair"),block("💷","Sell Surplus Stock","Asset recovery","Recover cash on unwanted or surplus equipment.","Sell to Combay","/asset-recovery")],ctaHeading:"Ready to work with us?",ctaBody:"Browse our stock, book a repair, or sell your surplus equipment today.",ctaPrimaryLabel:"Browse Stock →",ctaPrimaryHref:"/shop",ctaSecondaryLabel:"Contact Us",ctaSecondaryHref:"/contact"}),
    contact:page({eyebrow:"Contact",heading:"Get in",accent:"touch.",body:"We respond to all enquiries within 24 hours.",primaryLabel:"Send message",primaryHref:"#form",secondaryLabel:"Call Us",secondaryHref:"tel:+447340383334",sectionEyebrow:"Contact Combay",sectionHeading:"Send us a message",sectionBody:"For orders, quotes, general enquiries or media requests, use the correct contact route below.",ctaHeading:"Need a quote or support?",ctaBody:"Use the form and our team will respond within 24 hours."})
  },
  faq:{eyebrow:"Support",heading:"Frequently Asked Questions",body:"Find quick answers for buying equipment, booking repairs and selling surplus stock to Combay.",backgroundImageUrl:"",groups:[
    {key:"general",label:"General",items:[
      {question:"What does Combay do?",answer:"Combay supplies tested industrial, commercial, laboratory, AV, IT and automation equipment. We also repair equipment and buy surplus stock from businesses."},
      {question:"Where is Combay based?",answer:"Combay is UK-based and supports customers across the UK and internationally depending on the equipment and shipping requirements."},
      {question:"How quickly do you respond?",answer:"We aim to respond to most enquiries within 24 working hours. Urgent stock, repair and asset recovery requests are prioritised where possible."}
    ]},
    {key:"buying",label:"Buying from Combay",items:[
      {question:"Are items tested before dispatch?",answer:"Items are inspected, graded and tested where practical. The product page or quotation will state the condition and any limitations clearly."},
      {question:"Do purchases include warranty?",answer:"Most items include a 30-day return-to-base warranty unless the item is clearly sold as for-parts, faulty or without warranty."},
      {question:"Can I request a quote instead of buying online?",answer:"Yes. Use Request Quote on a product page or contact sales@combay.co.uk with the MPN, model, quantity and delivery country."},
      {question:"Can Combay source stock that is not listed?",answer:"Yes. Send the manufacturer, MPN/model and quantity required and we will check our network and incoming stock."}
    ]},
    {key:"repairing",label:"Repairing with Combay",items:[
      {question:"What equipment can Combay repair?",answer:"We support a wide range of industrial automation, electronic, test, laboratory and commercial equipment. Send the model number and fault description for review."},
      {question:"Do repaired items include warranty?",answer:"Repaired items carry a 60-day checking warranty after return, unless a different term is stated on the repair quotation."},
      {question:"Do you collect repair items?",answer:"Collection options are available depending on the item, location and service route. We will confirm this with your repair quote."},
      {question:"Is repair always cheaper than replacement?",answer:"Not always, but we assess the practical route. Where repair is viable, we aim to reduce unnecessary replacement spend and downtime."}
    ]},
    {key:"selling",label:"Selling to Combay",items:[
      {question:"What surplus stock does Combay buy?",answer:"We buy industrial automation parts, lab/scientific instruments, test equipment, IT/networking, AV/broadcast equipment and other commercial assets."},
      {question:"How do I send a stock list?",answer:"Download the Asset Disposal stocklist template from the Asset Recovery page, complete as much detail as possible and send it to sales@combay.co.uk."},
      {question:"Do you collect equipment?",answer:"Yes. For approved asset recovery purchases, collection can be arranged. Payment terms and collection details are confirmed before removal."},
      {question:"Can you value mixed or untested stock?",answer:"Yes. Use the condition codes in the stocklist and add notes/photos. We can review mixed lots, site clearances and warehouse surplus."}
    ]}
  ],previewItems:[{question:"What does Combay do?",answer:"Combay supplies tested industrial equipment, repairs valuable units and buys surplus stock from businesses."},{question:"Do purchases include warranty?",answer:"Most items include a 30-day return-to-base warranty unless clearly stated otherwise."},{question:"How do I sell surplus stock to Combay?",answer:"Send a stock list or photos through the Asset Recovery page. We review, quote and arrange collection where agreed."}],ctaHeading:"Still have questions?",ctaBody:"Our team responds within 24 hours.",ctaLabel:"Contact Us →",ctaHref:"/contact"}
};
function text(v:unknown,f:string){return typeof v==="string"&&v.trim()?v.trim():f}
function opt(v:unknown){return typeof v==="string"?v.trim():""}
function href(v:unknown,f:string){const t=text(v,f);return t.startsWith("/")||t.startsWith("#")||t.startsWith("mailto:")||t.startsWith("tel:")||t.startsWith("http")?t:f}
function mergeBlock(i:any,f:CmsBlock):CmsBlock{return{icon:text(i?.icon,f.icon),title:text(i?.title,f.title),subtitle:text(i?.subtitle,f.subtitle),body:text(i?.body,f.body),imageUrl:opt(i?.imageUrl)||f.imageUrl,linkLabel:opt(i?.linkLabel)||f.linkLabel,linkHref:href(i?.linkHref,f.linkHref||"#"),blockType:text(i?.blockType,f.blockType||"icon"),width:text(i?.width,f.width||"quarter"),align:text(i?.align,f.align||"left"),background:text(i?.background,f.background||"white"),animation:text(i?.animation,f.animation||"none")}}
function mergeStep(i:any,f:CmsStep):CmsStep{return{number:text(i?.number,f.number),title:text(i?.title,f.title),body:text(i?.body,f.body),imageUrl:opt(i?.imageUrl)||f.imageUrl}}
function arr<T>(raw:any,f:T[],fn:(i:any,f:T)=>T,max=20){const input=Array.isArray(raw)?raw:[];const len=Math.max(input.length,f.length);return Array.from({length:len}).map((_,i)=>fn(input[i],f[i]||input[i])).filter(Boolean).slice(0,max)}

function stringArray(raw: unknown, fallback: string[], max = 8): string[] {
  const source = Array.isArray(raw) ? raw : fallback;
  const cleaned = source.map((item) => String(item || "").trim()).filter(Boolean).slice(0, max);
  return cleaned.length ? cleaned : fallback;
}
function mergePage(i:any,f:CmsPage):CmsPage{const allowed=["hero","contactBar","content","process","formOrCta"];const rawOrder=Array.isArray(i?.sectionOrder)?i.sectionOrder.map((x:any)=>String(x)).filter((x:string)=>allowed.includes(x)):[];const order=(rawOrder.length?rawOrder:f.sectionOrder||allowed).filter((x:string,i:number,a:string[])=>a.indexOf(x)===i);return{eyebrow:text(i?.eyebrow,f.eyebrow),heading:text(i?.heading,f.heading),accent:text(i?.accent,f.accent),body:text(i?.body,f.body),backgroundImageUrl:opt(i?.backgroundImageUrl)||f.backgroundImageUrl,heroImageUrl:opt(i?.heroImageUrl)||f.heroImageUrl,primaryLabel:text(i?.primaryLabel,f.primaryLabel),primaryHref:href(i?.primaryHref,f.primaryHref),secondaryLabel:text(i?.secondaryLabel,f.secondaryLabel),secondaryHref:href(i?.secondaryHref,f.secondaryHref),sectionEyebrow:text(i?.sectionEyebrow,f.sectionEyebrow),sectionHeading:text(i?.sectionHeading,f.sectionHeading),sectionBody:text(i?.sectionBody,f.sectionBody),blocks:arr(i?.blocks,f.blocks,mergeBlock,40),steps:arr(i?.steps,f.steps,mergeStep,30),ctaHeading:text(i?.ctaHeading,f.ctaHeading),ctaBody:text(i?.ctaBody,f.ctaBody),ctaPrimaryLabel:text(i?.ctaPrimaryLabel,f.ctaPrimaryLabel),ctaPrimaryHref:href(i?.ctaPrimaryHref,f.ctaPrimaryHref),ctaSecondaryLabel:text(i?.ctaSecondaryLabel,f.ctaSecondaryLabel),ctaSecondaryHref:href(i?.ctaSecondaryHref,f.ctaSecondaryHref),sectionOrder:order.length?order:allowed,quoteImageUrl:opt(i?.quoteImageUrl)||f.quoteImageUrl,quoteName:text(i?.quoteName,f.quoteName),quoteDesignation:text(i?.quoteDesignation,f.quoteDesignation),quoteText:text(i?.quoteText,f.quoteText),proofPoints:stringArray(i?.proofPoints,f.proofPoints)}}

function upgradeAboutPage(p: CmsPage): CmsPage {
  const shortBody = "Combay was built by engineers who understand what happens when critical equipment stops running.";
  const shortSection = "Combay offers a faster route to tested stock, repair and asset recovery.";
  const oldLongSection = p.sectionBody.trim().startsWith("Industrial operations depend on equipment that is often obsolete");
  if (p.body.trim() === shortBody || p.sectionBody.trim() === shortSection || p.blocks.length <= 3 || oldLongSection) {
    return { ...defaultSiteContent.pages.about, blocks: p.blocks.length > 3 ? p.blocks : defaultSiteContent.pages.about.blocks, quoteImageUrl: p.quoteImageUrl || defaultSiteContent.pages.about.quoteImageUrl, quoteName: p.quoteName || defaultSiteContent.pages.about.quoteName, quoteDesignation: p.quoteDesignation || defaultSiteContent.pages.about.quoteDesignation, quoteText: p.quoteText || defaultSiteContent.pages.about.quoteText };
  }
  return { ...p, proofPoints: stringArray(p.proofPoints, defaultSiteContent.pages.about.proofPoints, 5) };
}
function mergeSlide(i:any,f:SiteHeroSlide):SiteHeroSlide{
  const legacyHeroText = new Set([
    "Mission-critical equipment,", "ready to dispatch.",
    "Tested, warranted industrial and commercial equipment. 30-day warranty. Trusted by UK businesses across every industry.",
    "40% lower than", "manufacturer quotes.",
    "Free collection. 60-day checking warranty. Calibration, repair, PPM and installation — all covered by our engineers.",
    "Cash for your", "surplus equipment.",
    "Fair value. Free collection from anywhere. Payment before goods leave your site. No stock list needed."
  ]);
  const cleanText = (v:unknown, fallback:string) => {
    const t = typeof v === "string" ? v.trim() : "";
    return t && !legacyHeroText.has(t) ? t : fallback;
  };
  return{...f,eyebrow:text(i?.eyebrow,f.eyebrow),heading:cleanText(i?.heading,f.heading),accent:cleanText(i?.accent,f.accent),body:cleanText(i?.body,f.body),cta1Label:text(i?.cta1Label,f.cta1Label),cta1Href:href(i?.cta1Href,f.cta1Href),cta2Label:text(i?.cta2Label,f.cta2Label),cta2Href:href(i?.cta2Href,f.cta2Href),stat1Value:text(i?.stat1Value,f.stat1Value),stat1Label:text(i?.stat1Label,f.stat1Label),stat2Value:text(i?.stat2Value,f.stat2Value),stat2Label:text(i?.stat2Label,f.stat2Label),stat3Value:text(i?.stat3Value,f.stat3Value),stat3Label:text(i?.stat3Label,f.stat3Label),imageUrl:opt(i?.imageUrl)||f.imageUrl,backgroundImageUrl:opt(i?.backgroundImageUrl)||f.backgroundImageUrl}
}
function mergeFaqItem(i:any,f:FaqItem):FaqItem{return{question:text(i?.question,f.question),answer:text(i?.answer,f.answer)}}
function mergeFaqGroup(i:any,f:FaqGroup):FaqGroup{return{key:text(i?.key,f.key).toLowerCase().replace(/[^a-z0-9-]/g,"-")||f.key,label:text(i?.label,f.label),items:arr(i?.items,f.items,mergeFaqItem,40)}}

function mergePolicy(i:any,f:PolicyPageContent):PolicyPageContent{return{eyebrow:text(i?.eyebrow,f.eyebrow),heading:text(i?.heading,f.heading),lastUpdated:text(i?.lastUpdated,f.lastUpdated),body:text(i?.body,f.body),footer:text(i?.footer,f.footer)}}

function mergeVisualWidget(i:any, fallbackIndex=0): VisualWidget {
  const allowed = new Set(["section","video","card","button","text","image","promotion","spacer","divider"]);
  const rawType = String(i?.type || "card");
  const type = allowed.has(rawType) ? rawType : "card";
  return {
    id: text(i?.id, `vw-${Date.now()}-${fallbackIndex}`),
    type,
    title: opt(i?.title), subtitle: opt(i?.subtitle), body: opt(i?.body), text: opt(i?.text),
    textKind: ["heading","subheading","paragraph","caption"].includes(String(i?.textKind)) ? i.textKind : "paragraph",
    icon: opt(i?.icon), imageUrl: opt(i?.imageUrl), videoUrl: opt(i?.videoUrl), thumbnailUrl: opt(i?.thumbnailUrl), caption: opt(i?.caption),
    url: href(i?.url, i?.type === "button" ? "/contact" : "#"), linkLabel: opt(i?.linkLabel), promoCode: opt(i?.promoCode), copyCodeEnabled: Boolean(i?.copyCodeEnabled),
    openInNewTab: Boolean(i?.openInNewTab), buttonStyle: ["primary","secondary","outline"].includes(String(i?.buttonStyle)) ? i.buttonStyle : "primary",
    autoplay: Boolean(i?.autoplay), muted: Boolean(i?.muted), loop: Boolean(i?.loop),
    width: text(i?.width, type === "promotion" || type === "divider" || type === "spacer" ? "full" : "quarter"),
    align: ["left","center","right"].includes(String(i?.align)) ? i.align : "left",
    height: Number.isFinite(Number(i?.height)) ? Number(i.height) : (type === "spacer" ? 48 : undefined),
    thickness: Number.isFinite(Number(i?.thickness)) ? Number(i.thickness) : (type === "divider" ? 1 : undefined),
    colour: opt(i?.colour), background: opt(i?.background),
    marginTop: Number.isFinite(Number(i?.marginTop)) ? Number(i.marginTop) : 0,
    marginBottom: Number.isFinite(Number(i?.marginBottom)) ? Number(i.marginBottom) : 0,
    columns: Number.isFinite(Number(i?.columns)) ? Math.max(1, Math.min(4, Number(i.columns))) : (type === "section" ? 1 : undefined),
    sectionVariant: ["plain","soft","dark","accent"].includes(String(i?.sectionVariant)) ? i.sectionVariant : "plain",
    visible: i?.visible === false ? false : true,
  };
}
function mergeVisualWidgets(raw:any): Record<string, VisualWidget[]> {
  const out: Record<string, VisualWidget[]> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [zone, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    out[String(zone)] = items.map((item, index) => mergeVisualWidget(item, index)).filter((item) => item.visible !== false).slice(0, 80);
  }
  return out;
}


function containsTestArtifact(value?: string): boolean {
  const textValue = String(value || "").trim().toLowerCase();
  if (!textValue) return false;
  return ["new faq question", "new card", "video placeholder", "add the answer here"].some((needle) => textValue.includes(needle));
}

function cleanBlocks(page: "home" | "about", pageData: CmsPage): CmsPage {
  const fallback = defaultSiteContent.pages[page];
  const expectedHomeTitles = new Set(["Replace or Buy Equipment", "Repair Your Goods", "Sell Your Unwanted Goods"]);
  const cleaned = (pageData.blocks || []).filter((block) => ![
    block.title,
    block.subtitle,
    block.body,
    block.linkLabel,
  ].some(containsTestArtifact));
  const titles = cleaned.map((block) => String(block.title || "").trim()).filter(Boolean);
  const uniqueTitles = new Set(titles);
  const hasDuplicates = titles.length !== uniqueTitles.size;
  if (page === "home") {
    const hasExpected = Array.from(expectedHomeTitles).every((title) => uniqueTitles.has(title));
    if (hasDuplicates || !hasExpected || cleaned.length !== 3) {
      return { ...pageData, blocks: fallback.blocks };
    }
    return { ...pageData, blocks: cleaned };
  }
  if (page === "about") {
    const hasArtifacts = cleaned.length !== (pageData.blocks || []).length;
    const tooManyCards = cleaned.length > fallback.blocks.length + 1;
    const missingCoreCards = !["Buy Equipment", "Repair Equipment", "Sell Surplus Stock"].every((title) => uniqueTitles.has(title));
    if (hasArtifacts || hasDuplicates || tooManyCards || missingCoreCards) {
      return { ...pageData, blocks: fallback.blocks };
    }
    return { ...pageData, blocks: cleaned };
  }
  return pageData;
}

function cleanVisualWidgetsMap(widgets: Record<string, VisualWidget[]>): Record<string, VisualWidget[]> {
  const out: Record<string, VisualWidget[]> = {};
  for (const [zone, items] of Object.entries(widgets || {})) {
    const safe = items.filter((widget) => {
      const textFields = [widget.title, widget.subtitle, widget.body, widget.text, widget.caption, widget.linkLabel];
      if (textFields.some(containsTestArtifact)) return false;
      if (widget.type === "video" && !widget.videoUrl && !widget.thumbnailUrl && !widget.title && !widget.caption) return false;
      return true;
    });
    if (safe.length) out[zone] = safe;
  }
  return out;
}

function cleanFaqItems(items: FaqItem[]): FaqItem[] {
  return (items || []).filter((item) => !containsTestArtifact(item.question) && !containsTestArtifact(item.answer));
}

function cleanFaqGroups(groups: FaqGroup[]): FaqGroup[] {
  return (groups || []).map((group) => ({ ...group, items: cleanFaqItems(group.items) })).filter((group) => group.items.length > 0);
}


function ensureFaqTabs(groups: FaqGroup[]): FaqGroup[] {
  const required = defaultSiteContent.faq.groups;
  const keys = new Set((groups || []).map((g) => g.key));
  const hasRequired = ["general", "buying", "repairing", "selling"].every((key) => keys.has(key));
  if (!hasRequired) return required;
  return groups;
}

function hiddenSections(raw:any):Record<string,string[]>{
  const out:Record<string,string[]>={};
  if(!raw||typeof raw!=="object") return out;
  for(const [page,items] of Object.entries(raw)){
    if(!Array.isArray(items)) continue;
    out[String(page)] = Array.from(new Set(items.map((x:any)=>String(x||"").trim()).filter(Boolean))).slice(0,30);
  }
  return out;
}
export function isSectionHidden(content: SiteContent | undefined, page: string, section: string): boolean {
  if (!content?.hiddenSections) return false;
  return Array.isArray(content.hiddenSections[page]) && content.hiddenSections[page].includes(section);
}
function cleanTextStyles(raw: any): Record<string, CmsTextStyle> {
  const out: Record<string, CmsTextStyle> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const item = value as Record<string, unknown>;
    const style: CmsTextStyle = {};
    if (typeof item.fontSize === "string") style.fontSize = item.fontSize.slice(0, 32);
    if (typeof item.fontFamily === "string") style.fontFamily = item.fontFamily.slice(0, 120);
    if (typeof item.fontWeight === "string") style.fontWeight = item.fontWeight.slice(0, 16);
    if (typeof item.colour === "string") style.colour = item.colour.slice(0, 32);
    if (typeof item.italic === "boolean") style.italic = item.italic;
    if (Object.keys(style).length) out[String(key).slice(0, 120)] = style;
  }
  return out;
}
export function normaliseSiteContent(input: unknown): SiteContent { const raw:any=typeof input==="object"&&input?input:{}; const f=defaultSiteContent; return { hiddenSections:hiddenSections(raw.hiddenSections), visualWidgets:cleanVisualWidgetsMap(mergeVisualWidgets(raw.visualWidgets)), textStyles:cleanTextStyles(raw.textStyles), policies:{terms:mergePolicy(raw.policies?.terms,f.policies.terms),privacy:mergePolicy(raw.policies?.privacy,f.policies.privacy),returns:mergePolicy(raw.policies?.returns,f.policies.returns),warranty:mergePolicy(raw.policies?.warranty,f.policies.warranty),payment:mergePolicy(raw.policies?.payment,f.policies.payment)}, heroSlides:f.heroSlides.map((x,i)=>mergeSlide(raw.heroSlides?.[i],x)), trust:{eyebrow:text(raw.trust?.eyebrow,f.trust.eyebrow),heading:text(raw.trust?.heading,f.trust.heading),accent:text(raw.trust?.accent,f.trust.accent),clients:Array.isArray(raw.trust?.clients)?raw.trust.clients.map((x:any)=>String(x||"").trim()).filter(Boolean).slice(0,40):f.trust.clients,backgroundImageUrl:opt(raw.trust?.backgroundImageUrl)||f.trust.backgroundImageUrl}, finalCta:{eyebrow:text(raw.finalCta?.eyebrow,f.finalCta.eyebrow),heading:text(raw.finalCta?.heading,f.finalCta.heading),body:text(raw.finalCta?.body,f.finalCta.body),primaryLabel:text(raw.finalCta?.primaryLabel,f.finalCta.primaryLabel),primaryHref:href(raw.finalCta?.primaryHref,f.finalCta.primaryHref),secondaryLabel:text(raw.finalCta?.secondaryLabel,f.finalCta.secondaryLabel),secondaryHref:href(raw.finalCta?.secondaryHref,f.finalCta.secondaryHref),tertiaryLabel:text(raw.finalCta?.tertiaryLabel,f.finalCta.tertiaryLabel),tertiaryHref:href(raw.finalCta?.tertiaryHref,f.finalCta.tertiaryHref),backgroundImageUrl:opt(raw.finalCta?.backgroundImageUrl)||f.finalCta.backgroundImageUrl}, contact:{salesEmail:text(raw.contact?.salesEmail,f.contact.salesEmail),infoEmail:text(raw.contact?.infoEmail,f.contact.infoEmail),phone:text(raw.contact?.phone,f.contact.phone),location:text(raw.contact?.location,f.contact.location),whatsapp:text(raw.contact?.whatsapp,f.contact.whatsapp),businessHours:text(raw.contact?.businessHours,f.contact.businessHours),mapEmbedUrl:text(raw.contact?.mapEmbedUrl,f.contact.mapEmbedUrl)}, footer:{description:text(raw.footer?.description,f.footer.description),backgroundImageUrl:opt(raw.footer?.backgroundImageUrl)||f.footer.backgroundImageUrl}, pages:{home:cleanBlocks("home", mergePage(raw.pages?.home,f.pages.home)),repair:mergePage(raw.pages?.repair,f.pages.repair),assetRecovery:mergePage(raw.pages?.assetRecovery,f.pages.assetRecovery),about:cleanBlocks("about", upgradeAboutPage(mergePage(raw.pages?.about,f.pages.about))),contact:mergePage(raw.pages?.contact,f.pages.contact)}, faq:{eyebrow:text(raw.faq?.eyebrow,f.faq.eyebrow),heading:text(raw.faq?.heading,f.faq.heading),body:text(raw.faq?.body,f.faq.body),backgroundImageUrl:opt(raw.faq?.backgroundImageUrl)||f.faq.backgroundImageUrl,groups:ensureFaqTabs(cleanFaqGroups(arr(raw.faq?.groups,f.faq.groups,mergeFaqGroup,12))),previewItems:cleanFaqItems(arr(raw.faq?.previewItems,f.faq.previewItems,mergeFaqItem,10)),ctaHeading:text(raw.faq?.ctaHeading,f.faq.ctaHeading),ctaBody:text(raw.faq?.ctaBody,f.faq.ctaBody),ctaLabel:text(raw.faq?.ctaLabel,f.faq.ctaLabel),ctaHref:href(raw.faq?.ctaHref,f.faq.ctaHref)} } }
export async function getSiteContent(): Promise<SiteContent> { const dbResult=await withDatabase(async()=>{ const row=await prisma.siteSetting.findUnique({where:{key:SITE_CONTENT_KEY}}); if(!row?.value) return defaultSiteContent; try{return normaliseSiteContent(JSON.parse(row.value))}catch{return defaultSiteContent} }); return dbResult.ok?dbResult.data:defaultSiteContent }
export async function saveSiteContent(content: SiteContent): Promise<SiteContent> { const safe=normaliseSiteContent(content); await prisma.siteSetting.upsert({where:{key:SITE_CONTENT_KEY},update:{value:JSON.stringify(safe)},create:{key:SITE_CONTENT_KEY,value:JSON.stringify(safe)}}); return safe }
