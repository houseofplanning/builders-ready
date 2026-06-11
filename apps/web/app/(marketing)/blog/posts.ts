/**
 * Blog post catalogue. For v1, posts are inline TS objects with HTML content.
 * Once volume grows we'd swap this for MDX or a headless CMS — for now,
 * three SEO-targeted starter posts is plenty.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingTime: string;
  category: string;
  contentHtml: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: 'the-decision-log-cheapest-insurance-in-construction',
    title: 'The decision log: the cheapest insurance a builder can buy',
    description:
      'Every renovation is hundreds of small decisions, and the verbal ones evaporate the moment there is a dispute. Here is how a simple decision log protects builders of every size — and exactly what to capture for each one.',
    publishedAt: '2026-06-08',
    readingTime: '6 min read',
    category: 'Industry',
    contentHtml: `
<p>Ask any experienced builder where projects go wrong and very few will say "the brickwork." They will say the kitchen tap the client swears they never chose, the radiator that moved 300mm without anyone writing it down, the tile the client "definitely said the matte one" about. Construction is not really a series of physical tasks. It is a series of decisions, and the physical work is just the output.</p>

<p>A £15k bathroom involves perhaps forty decisions. A £400k extension involves several hundred. Each one is small. Each one feels obvious at the time. And each one is a future dispute waiting for a memory to fade.</p>

<h2>Why memory is not a record</h2>

<p>The problem is not dishonesty — yours or the client's. The problem is that human memory is reconstructive. Three months after a doorway conversation about handle finishes, you and your client will both remember it differently, and both of you will be completely sincere. There is no liar in the room. There is just no record.</p>

<p>This is why a decision log is not bureaucracy. It is the single cheapest piece of risk management available to a builder, and it works regardless of the size of the firm. A sole trader arguably needs it more than a large contractor, because one disputed £600 decision on a small job hurts proportionally more.</p>

<h2>What belongs in every decision</h2>

<p>A decision log entry does not need to be elaborate. It needs five things:</p>

<ul>
  <li><strong>What was being decided</strong> — "Bathroom tap finish", not "the tap thing".</li>
  <li><strong>The options offered</strong> — ideally with a photo and a price against each, so the cost consequence is visible at the point of choosing.</li>
  <li><strong>What the client chose</strong> — the specific option, unambiguously.</li>
  <li><strong>Who decided and when</strong> — a name and a timestamp.</li>
  <li><strong>The cost impact</strong> — even if it is £0. Especially if it is not.</li>
</ul>

<p>Capture those five and almost every "we never agreed that" conversation ends before it starts. Not because you are trying to win an argument, but because there is no argument to have.</p>

<h2>The cost-at-the-point-of-decision trick</h2>

<p>The most underrated line in that list is putting the price next to each option <em>before</em> the client chooses. Builders routinely let clients pick the upgraded item and only surface the cost on the final invoice. That is where resentment is born — not because the client objects to paying more, but because they feel ambushed.</p>

<p>Show the £90 tap and the £240 tap side by side, with the numbers visible, and the client makes an informed choice they own. The same £150 difference that would have caused a row at invoice stage becomes a decision they remember making. The money did not change. The framing did.</p>

<h2>How to actually keep one</h2>

<p>You can run a decision log in a notebook, a spreadsheet, or a shared document. Any record beats no record. But three things separate a log that protects you from one that gathers dust:</p>

<ul>
  <li><strong>It has to be effortless on site.</strong> If logging a decision takes more than thirty seconds on your phone, it will not happen during a busy day, and a log with gaps is worse than useless because it implies the gaps were never decided.</li>
  <li><strong>The client has to confirm it themselves.</strong> A decision you recorded unilaterally is still your word against theirs. A decision the client actively accepted — a tap, a tick, a signature — is something else entirely.</li>
  <li><strong>It has to survive the project.</strong> A log scattered across text messages and notebooks is not a record you can hand over. It needs to live in one place and come out the other end as a single document.</li>
</ul>

<h2>Where the log pays for itself</h2>

<p>The return on a decision log shows up in three places. At invoice stage, because every cost was agreed in advance and nothing is a surprise. At handover, because the accumulated decisions become part of the record you give the client. And in the rare case it goes legal, because a timestamped, client-confirmed log is the difference between a strong position and your word against theirs.</p>

<p>This is exactly why decisions are a first-class feature in Builders Ready rather than an afterthought: you raise a decision with options, photos and prices, the client taps to choose on their phone, and the choice is logged with their identity, the timestamp and the cost — then flows straight into the handover document. But the principle stands whatever tool you use. Log the decision, price the options, get the client to own the choice. It is the cheapest insurance in construction.</p>
`,
  },
  {
    slug: 'getting-paid-on-time-uk-builders',
    title: 'Getting paid on time: payment terms, retention and your rights as a UK builder',
    description:
      'Late payment closes more building firms than bad workmanship ever does. Here is how to structure payment terms, when statutory rights actually apply, and how transparency gets you paid faster.',
    publishedAt: '2026-06-01',
    readingTime: '8 min read',
    category: 'Finance',
    contentHtml: `
<p>More building firms are killed by cash flow than by poor workmanship. A builder can do excellent work, win referrals, and still go under because £40k of completed work is sitting unpaid while wages, merchants and subcontractors all need paying now. Profit is an opinion; cash is a fact.</p>

<p>Getting paid on time is partly about the law, but mostly about how you set the job up before a single brick is laid. Here is how the two fit together.</p>

<h2>Payment terms are won before the job starts</h2>

<p>The single biggest driver of getting paid on time is a clear, written payment schedule agreed before work begins. Vague terms — "stage payments as we go" — are an invitation to disputes. Specific terms are not.</p>

<ul>
  <li><strong>Take a deposit.</strong> For most domestic work a deposit confirms commitment and funds initial materials. Keep it proportionate; excessive deposits can fall foul of consumer protection rules and frighten good clients.</li>
  <li><strong>Bill in stages tied to milestones, not dates.</strong> "On completion of first-fix" is verifiable and hard to argue with. "Week four" is not, because weeks slip.</li>
  <li><strong>Keep stages small.</strong> Frequent, smaller invoices smooth your cash flow and shrink the size of any single dispute. A client querying a £3k stage payment is a smaller problem than one querying a £30k final bill.</li>
  <li><strong>Put the terms in writing and have the client agree them.</strong> A schedule the client has actually seen and accepted is enforceable in a way a verbal understanding never is.</li>
</ul>

<h2>What the law actually gives you — and what it does not</h2>

<p>This is where a lot of confident pub advice is simply wrong, because the rules depend on <em>who your client is</em>.</p>

<p><strong>Commercial clients (business to business).</strong> If you are working for another business — a main contractor, a commercial landlord, a developer — the Late Payment of Commercial Debts (Interest) Act 1998 applies. It gives you the right to charge statutory interest (8% above the Bank of England base rate) plus fixed compensation on overdue invoices, even if your contract is silent on the matter. Separately, the Housing Grants, Construction and Regeneration Act 1996 (the "Construction Act") gives parties to most construction contracts the right to stage payments, payment and "pay less" notices, and the right to suspend work for non-payment.</p>

<p><strong>Domestic clients (homeowners).</strong> Here is the catch most builders miss: the Construction Act specifically excludes contracts with a "residential occupier" — i.e. a homeowner having work done on their own home. And the Late Payment Act applies to commercial debts, not consumer ones. So on a typical homeowner job, neither statute is riding to your rescue. Your right to be paid, and when, comes almost entirely from <em>the contract you agreed</em>. That is precisely why the written schedule above matters so much: for domestic work, it is your main protection.</p>

<p>None of this is legal advice for your specific situation — if a payment dispute is heading towards court, take proper advice. But knowing which regime you are in tells you how much you are relying on paperwork versus statute.</p>

<h2>Retention, and whether you should accept it</h2>

<p>On larger and commercial jobs, clients may hold "retention" — commonly around 2.5% to 5% of each payment — released after a defects period (often six to twelve months) once any snags are resolved. Retention protects the client, but it parks your money and a meaningful share of retained sums are never released without chasing. If you accept retention, write down exactly when and how it is released, and diarise the release date. On domestic work, retention is far less common and usually not worth introducing.</p>

<h2>Transparency is a payment tool, not just a nicety</h2>

<p>Here is the part builders underrate: clients pay faster when they can see what they are paying for. An invoice that arrives cold, months into a job, with a number the client cannot reconcile, gets queried. An invoice that lands against a backdrop of visible progress, agreed variations and a running quote-versus-final total gets paid.</p>

<p>When the client has watched the project unfold — milestones ticked off, variations they signed for, photos of the work — the invoice is the expected conclusion of a story they already believe. There is nothing to dispute because nothing is new.</p>

<h2>A simple system that gets you paid</h2>

<ul>
  <li>Agree a written, milestone-based payment schedule before starting.</li>
  <li>Invoice promptly the moment a milestone is hit — not in a monthly batch.</li>
  <li>Make every variation a priced, client-agreed item so it is never a surprise on the bill.</li>
  <li>Keep the client's view of finance live: quoted, varied, invoiced, paid, outstanding.</li>
  <li>Chase politely but immediately. The longer an invoice ages, the harder it is to collect.</li>
</ul>

<p>Builders Ready is built around this: invoices are tied to projects the client has been watching, every variation is signed before it reaches the bill, and both you and the client see the same live finance summary. Online invoice payment is on our roadmap — but even today, the fastest route to getting paid is removing every reason a client has to hesitate.</p>
`,
  },
  {
    slug: 'how-to-run-a-snagging-list',
    title: 'How to run a snagging list that gets you signed off and paid',
    description:
      'The snagging stage is where goodwill is won or lost — and where final payment quietly stalls. Here is how to run a snag list that protects your reputation and closes the job cleanly.',
    publishedAt: '2026-05-25',
    readingTime: '6 min read',
    category: 'Operations',
    contentHtml: `
<p>Snagging is the most emotionally charged stage of any build. The hard work is done, the client is excited to move in or move on, and suddenly the conversation is entirely about what is <em>wrong</em> — the paint nib by the architrave, the door that catches, the silicone line that is not quite straight. Handled well, snagging is the moment a good job becomes a referral. Handled badly, it is where final payment stalls and goodwill evaporates.</p>

<h2>What snagging actually is</h2>

<p>A "snag" is a minor defect or unfinished item identified at or near completion — the small stuff that falls short of the agreed standard. Snagging is the process of listing those items, agreeing them, fixing them, and getting the client to confirm they are done. It is normal. Every project has snags. A project with zero snags usually means nobody looked properly.</p>

<p>The mistake builders make is treating snagging as an informal "let me know if you spot anything" — which leaves the list open-ended, undocumented, and entirely in the client's control. That is how a job stays "nearly finished" for two months while the final payment sits unpaid.</p>

<h2>Run the snag list as a structured handover, not a complaints box</h2>

<p>The shift that changes everything is to own the snagging process rather than wait to be told. Walk the project with the client, room by room, and build the list <em>together</em>. This does three things: it surfaces issues while you are there to assess them, it stops new snags appearing indefinitely, and it signals professionalism — you are inviting scrutiny, not avoiding it.</p>

<ul>
  <li><strong>Do a self-snag first.</strong> Walk it yourself before the client does and fix the obvious. Half the items the client would have flagged disappear, and the ones that remain look like genuine fine-tuning rather than sloppiness.</li>
  <li><strong>Capture each snag specifically.</strong> Location, description, a photo. "Mark on landing wall, 1m from window" beats "wall needs touching up".</li>
  <li><strong>Agree what is in and out of scope.</strong> Some "snags" are actually new requests — a variation in disguise. Separate genuine defects from changes of mind, kindly but clearly, at the point they are raised.</li>
  <li><strong>Put a date against resolution.</strong> An open list with no timeline never closes. "These eleven items, done by Friday week" does.</li>
</ul>

<h2>Get the sign-off — it is what closes the job</h2>

<p>The single most important step is the one most builders skip: getting the client to confirm, in writing, that the snags are resolved and the work is accepted. Without it, the job is never formally finished, and "not finished" is the client's justification for holding payment.</p>

<p>Sign-off does not need to be a solicitor's letter. It needs to be a clear record: here was the agreed list, here is each item marked resolved, and here is the client confirming they are satisfied. The moment that exists, the final payment has no hiding place — and you have a clean, documented end to the project.</p>

<h2>Why this protects you long after handover</h2>

<p>A documented snag list is also your defence months later. If a client returns in six months claiming the work was never finished, an agreed and signed-off snag list is the difference between a quick resolution and an open-ended liability. It marks the line between defects you are responsible for and ordinary wear, settlement and use.</p>

<p>This is the logic behind tying snagging into the project record rather than running it on a scrap of paper. In Builders Ready, the work, the decisions and the variations already live in one place and roll into the handover document — and a structured snag list belongs in exactly the same record, signed off by the client and closed cleanly. Whatever tool you use, the rule is the same: own the list, agree it, fix it, and get it signed off. That is how a job ends with a referral instead of a row.</p>
`,
  },
  {
    slug: 'why-builders-are-abandoning-whatsapp',
    title:
      'Why UK builders are abandoning WhatsApp for client portals',
    description:
      "Whether you're refreshing a £15k bathroom or running a £400k extension, the same admin problems trip up every UK builder. Here's why builders of every size are switching to dedicated client portals — and what they're solving.",
    publishedAt: '2026-05-18',
    readingTime: '6 min read',
    category: 'Industry',
    contentHtml: `
<p>WhatsApp is an extraordinary product. It's the default messaging channel for most of the construction industry in the UK, and there's a reason: it's free, fast, ubiquitous, and your client probably has it open already.</p>

<p>It works fine until it doesn't. Whether you're a sole trader doing a £15k bathroom or a multi-PM firm running a £400k extension, the moment a project becomes more than a few exchanges, WhatsApp starts costing you time, money and — eventually — the recommendation.</p>

<p>This article isn't about premium-only builders. The problems below apply to <em>any</em> UK builder who has a client. The magnitudes change with project size. The failure modes don't.</p>

<h2>The problems WhatsApp creates on any client-facing project</h2>

<p><strong>1. Decisions get lost.</strong> "Did we agree on the brushed brass or the matte black?" Three months later you're in dispute because the agreed answer was a verbal nod in a 200-message group chat. The client says one thing, you say another, and the only audit trail is a scroll-back through paragraphs of "morning! 👋" messages.</p>

<p><strong>2. Variations turn into arguments.</strong> The client casually asked for a Quooker instead of the Franke. You added it. Now they're querying the £1,290 line on the final invoice because — in their head — they never agreed to anything. WhatsApp doesn't capture intent, doesn't capture cost, doesn't capture acceptance.</p>

<p><strong>3. Other people get added to the group.</strong> Their interior designer joins. Their architect joins. Their mum joins. Suddenly the project chat has nine people, the signal-to-noise ratio collapses, and you're managing emoji reactions from someone you've never met.</p>

<p><strong>4. Photos disappear into the void.</strong> 200 progress photos over nine months. Now find the one showing the steel beam before it was plastered over. Good luck.</p>

<p><strong>5. The handover is a Word doc — or nothing at all.</strong> Whether the project was £15k or £400k, the "record" you give the client is usually a folder of WhatsApp screenshots, a few invoices, and a wishful "let me know if you need anything else." That's the moment your client decides whether to recommend you. It matters.</p>

<h2>What a proper client portal does differently</h2>

<p>A purpose-built client portal — Builders Ready or otherwise — solves these in five ways:</p>

<ul>
  <li><strong>Decisions are first-class objects.</strong> You raise a decision. The client gets a push notification. They tap an option. The choice is logged with timestamp, identity, and price. End of dispute.</li>
  <li><strong>Variations require a signature.</strong> You propose a variation with title, description, cost delta and time impact. The client signs on their phone. No more "I never agreed to that."</li>
  <li><strong>Photos sit in a project timeline.</strong> Organised by week, by stage, by date. Searchable. Permanent.</li>
  <li><strong>Finance is live.</strong> Quote vs final, variations to date, invoiced vs paid — visible to both parties in real time. No surprise at handover.</li>
  <li><strong>Handover is one document.</strong> Generated server-side at the end of the project. Quote, every variation, every decision, every update, every invoice. The kind of record that gets you referrals.</li>
</ul>

<h2>Why now?</h2>

<p>Clients of every kind are increasingly tech-comfortable. They use Monzo, Notion, Splitwise, Strava. The polish bar for a service they're paying for — whether that's £15k or £400k — has gone up. WhatsApp now reads as scrappy, not pragmatic, on jobs of any size.</p>

<p>And builders are increasingly aware that the difference between a job that ends well and a job that ends in arguments is documentation. Not necessarily skill, not necessarily quality of work. Documentation. The small builder doing six projects a year benefits from this exactly as much as the firm doing sixty — possibly more, because one disputed variation hurts proportionately more.</p>

<h2>The argument against switching</h2>

<p>"My clients won't download an app."</p>

<p>This was true in 2018. It is no longer true. A client paying you anything from £10k upwards will install your app the same way they install their plumber's invoicing app, their accountant's portal, and their gym's booking app. If they push back, that's a useful signal about how much they trust you — and that signal is worth knowing early.</p>

<p>"I can't afford another monthly subscription."</p>

<p>The threshold of "afford" is one disputed variation per year. A single £500 variation dispute on a £20k bathroom that you lose because you can't prove acceptance pays for the portal multiple times over. Builders Ready is £29/month at the starter tier — less than a single takeaway coffee per working day. One project's worth of "I never agreed to that" pays for several years of subscription.</p>

<h2>What to look for in a client portal</h2>

<p>If you're shopping for one — and you should, regardless of project size — the must-haves are:</p>

<ul>
  <li>Decisions with options and audit trail</li>
  <li>Variations with signature capture</li>
  <li>Live finance summary</li>
  <li>Project handover document</li>
  <li>Mobile-first for the client (they will not log into a web portal)</li>
  <li>Web admin for the builder (you will not run your business from a phone)</li>
  <li>UK data residency and UK GDPR compliance</li>
</ul>

<p>Anything else is a nice-to-have. Anything missing is a deal-breaker.</p>
`,
  },
  {
    slug: 'legal-anatomy-of-a-construction-variation',
    title: 'The legal anatomy of a construction variation',
    description:
      'A variation isn\'t just "the client wanted something different." It\'s a contractual amendment with specific legal requirements — and it bites builders of every size, from sole traders to large firms. Here\'s what makes a variation legally robust in UK construction.',
    publishedAt: '2026-05-12',
    readingTime: '8 min read',
    category: 'Legal',
    contentHtml: `
<p>Most disputes in UK construction — at any project size — are not about quality of work. They are about scope. Specifically, they are about whether something the client asked for was inside the original contract or outside it.</p>

<p>The mechanism for handling "outside it" is the variation. And the failure to handle variations correctly is, by some margin, the most expensive operational mistake builders make.</p>

<p>This article walks through what a variation legally is, what makes one robust, and why the way most builders handle them is a slow-motion contract failure.</p>

<h2>What a variation actually is</h2>

<p>Under standard JCT and similar UK construction contracts, a variation is any change to the works described in the contract documents. It can be additive (the client wants underfloor heating in the en-suite, not originally specified), subtractive (the client decides against the second en-suite), or substitutive (Quooker tap instead of Franke).</p>

<p>The crucial point is that a variation is a <em>contractual amendment</em>. It modifies the agreed scope, the agreed price, and often the agreed completion date. It carries the same legal weight as the original contract itself.</p>

<p>This means:</p>

<ul>
  <li>It must be agreed in writing.</li>
  <li>It must specify the change to the scope.</li>
  <li>It must specify the change to the price.</li>
  <li>It must specify the change to the completion date (if any).</li>
  <li>Both parties must demonstrably consent.</li>
</ul>

<p>If any of these are missing, the variation is legally ambiguous — and ambiguity is what funds dispute lawyers.</p>

<h2>Where it goes wrong in practice</h2>

<p>In day-to-day client-facing work — from a £15k bathroom to a £400k extension — the typical variation conversation goes like this:</p>

<p><em>Client (in passing, on site, on a Tuesday):</em> "Actually we'd love a Quooker rather than the Franke. Can you do that?"</p>

<p><em>Builder:</em> "Yeah, that'll be a bit more, around £1,200. I'll add it."</p>

<p><em>Client:</em> "Great, thanks!"</p>

<p>Six months later, the final invoice shows a £1,290 line for the Quooker variation. The client, looking at it cold, says: "I don't remember agreeing to that price." A dispute is born.</p>

<p>What went wrong? Nothing was written. No specific price was confirmed. No completion-date impact was assessed. No signature was captured. The conversation happened, the work happened, but the contract documentation didn't keep up.</p>

<h2>What a legally robust variation looks like</h2>

<p>A defensible variation has six elements:</p>

<h3>1. A unique reference</h3>
<p>Variation V001, V002, V003 etc. So you can refer to it, both parties can refer to it, and it appears as a discrete line on the final account.</p>

<h3>2. A title</h3>
<p>"Substitute Quooker Fusion for originally-specified Franke tap" — not "kitchen tap." Specific enough that a third party reading it cold knows exactly what changed.</p>

<h3>3. A description</h3>
<p>What's changing and, ideally, why. "Client requested boiling-water functionality; includes tank, hot-water unit and reconfigured plumbing under sink." This protects you if the change cascades into other works.</p>

<h3>4. A monetary delta</h3>
<p>A specific pound figure. "+£1,290 inclusive of supply, installation and tank cost." Not "around £1,200." Not "see invoice." A number.</p>

<h3>5. A programme delta</h3>
<p>"+0 days" if it has no impact. "+2 days" if you need extra time. The omission of this is one of the most common sources of dispute — clients often expect variations to be cost-only, and resent any timeline impact unless flagged at the moment of agreement.</p>

<h3>6. Demonstrable acceptance</h3>
<p>A signature, an email approval with full quotation of the variation document, or — in a digital portal — a tap-to-accept with a logged user, timestamp and immutable record.</p>

<h2>Why "I said it on WhatsApp" doesn't count</h2>

<p>A WhatsApp message from a builder saying "Quooker variation £1,200" followed by a thumbs-up emoji from the client is, technically, evidence of an agreement. In practice, it is hopelessly weak:</p>

<ul>
  <li>WhatsApp messages can be deleted by either party.</li>
  <li>The thumbs-up doesn't quote what was agreed — it could refer to the preceding eight messages.</li>
  <li>There's no record of the specific scope ("Quooker Fusion" vs "Quooker Classic").</li>
  <li>There's no record of the programme impact.</li>
  <li>If the client claims the thumbs-up was a misclick, you have very little to fall back on.</li>
</ul>

<p>In a small claims dispute, this evidence might just about hold. In a £20k variation dispute heading to the TCC, it absolutely won't.</p>

<h2>The bare minimum standard for UK variations</h2>

<p>If you take nothing else from this article, take this:</p>

<p><strong>Every variation, regardless of size, should be a written record that includes: title, description, cost, programme impact, and an explicit confirmation of acceptance by the client.</strong></p>

<p>Builders Ready, as a piece of software, exists primarily because most builders find this admin friction too high to maintain by hand. A purpose-built tool collapses it to: type the variation, tap propose, client gets a notification, client signs with their finger, done. The audit trail is automatic.</p>

<p>But the principle holds whether you use Builders Ready, a Word template, or a paper form. Document every variation as if it were going to be read out in court, because occasionally one will be.</p>

<h2>One last thing — the cumulative effect</h2>

<p>The biggest source of "final account shock" isn't a single variation. It's the cumulative effect of fifteen small variations totalling £18k that the client never tracked. By the time they see the final number, they feel ambushed — even when every individual variation was technically agreed.</p>

<p>This is why a live finance dashboard matters as much as the variations themselves. If your client can see the running total — original quote £285k + variations to date £8,400 = current contracted value £293,400 — there's no shock at handover. The number was visible the whole time.</p>

<p>Transparency removes ambushes. Documentation prevents disputes. Both are far cheaper than litigation.</p>
`,
  },
  {
    slug: 'how-to-write-a-project-handover-document',
    title:
      'How to write a project handover document that protects your business',
    description:
      'The handover document is the single most important piece of paper you give a client — whether you delivered a £15k bathroom or a £400k extension. Here\'s what to include, why, and what most builders get wrong.',
    publishedAt: '2026-05-05',
    readingTime: '7 min read',
    category: 'Operations',
    contentHtml: `
<p>The day you hand over a finished project is a strange one. Nine months of effort, ten thousand decisions, one final walkthrough, and then a handshake and an envelope of certificates. For most builders, the handover is the final task — the project is done.</p>

<p>For your business, the handover is the most important moment. It's when the client decides whether to recommend you. It's the document they'll dig out in three years when they're selling the house. It's the only artefact that proves what you delivered against what was originally agreed.</p>

<p>Most handover documents in UK construction are bad — and this applies just as much to a £15k bathroom refresh as it does to a £400k extension. Not because builders don't care — they do — but because the document is left to the end, assembled in a panic, and produced under time pressure.</p>

<p>Here's what a proper handover document looks like.</p>

<h2>What a handover document is for</h2>

<p>It has three audiences:</p>

<ol>
  <li><strong>The client today</strong> — they need a record of what they paid for, what's where, and what they need to know about their newly-finished home.</li>
  <li><strong>The client in three years</strong> — when they're selling the house, an estate agent or surveyor will ask "do you have any documentation on the works?" A polished handover document is a value-additive selling document.</li>
  <li><strong>You, in case of dispute</strong> — six months after handover, when the client claims the underfloor heating wasn't part of the original scope, you point at the variations log inside the handover document. Discussion over.</li>
</ol>

<p>A document that serves only one of these audiences is incomplete. A good handover serves all three.</p>

<h2>What to include</h2>

<p>A handover document — for any client-facing project, big or small — should have, at minimum, these sections (scale the depth to the project):</p>

<h3>1. Project header</h3>
<p>Project name, address, postcode, original start date, actual completion date, original quote, final contracted value, list of variations, name of client, name of project manager, and your company information including Companies House number and VAT number.</p>

<h3>2. Quote vs final summary</h3>
<p>Single-page summary showing original quote, variations to date (signed), final contracted value, total invoiced, total paid. Both parties should agree on these numbers before handover — and the document is the artefact of that agreement.</p>

<h3>3. Timeline with stages</h3>
<p>The original 8-stage plan with actual start and end dates. Optionally: a brief commentary per stage if anything notable happened. This shows the client (and a future surveyor) that the project was managed methodically.</p>

<h3>4. Every variation in detail</h3>
<p>One section per variation: number, title, description, cost delta, programme delta, date signed, name of person who signed. Yes, every single one. This is the section that wins disputes.</p>

<h3>5. Every decision recorded</h3>
<p>List of decisions you raised with the client and what was chosen. "Splashback tile: Calacatta marble (£950). Pendant lights: bronze cone trio (£840)." Etc. Same principle: provable record.</p>

<h3>6. Project updates chronologically</h3>
<p>If you've been posting weekly updates with photos throughout the project, include them. Not as filler — as proof that you communicated. Future surveyors love progress photos because they show concealed work (steel beams, MEP first-fix, waterproofing) before it was covered.</p>

<h3>7. Invoices summary</h3>
<p>One line per invoice: number, title, amount, issued date, paid date, payment reference. Often clients have lost their copies; the handover document is the canonical record.</p>

<h3>8. Certificates and as-built drawings</h3>
<p>Building Regulations completion certificate. Electrical EICR. Gas safety certificate. Energy performance certificate. As-built drawings where applicable. Manufacturer warranties for major installations (boiler, MVHR, underfloor heating, roof).</p>

<h3>9. Aftercare and snagging</h3>
<p>Your snagging policy (typical: snag within 14 days of handover, fix within 28 days). Defects liability period (typically 12 months for residential). Out-of-hours emergency contact. Recommended maintenance schedule (when to service the MVHR, when to re-grout the bathroom, etc.).</p>

<h3>10. Builder details for future reference</h3>
<p>Bank account in case the client wants to bank-transfer a tip or future works. Your company registration. Your VAT number. Your contact email. Make it easy for the client to come back to you in three years.</p>

<h2>What most builders get wrong</h2>

<p><strong>They wait until the end.</strong> If you start assembling the handover at handover, you'll spend two days finding things. Assemble it incrementally — every signed variation, every decision, every paid invoice — and at the end it generates itself.</p>

<p><strong>They use a Word template.</strong> Word templates rot. Tables go misaligned. The client's name is missing from page 7 because someone forgot to find-and-replace it. The Companies House number is out of date. Use software that generates the document from your live project data — there is no manual step that can fail.</p>

<p><strong>They include only the positive bits.</strong> A handover document that hides the variations log is suspicious. Include everything, including variations that increased the price. Transparency builds trust; opacity invites scrutiny.</p>

<p><strong>They make it too long.</strong> A 60-page handover for a £200k extension is unreadable. The client will skim. Aim for 8-15 pages: punchy, structured, with the summary on page 1 and the detail in the appendices.</p>

<p><strong>They forget to brand it.</strong> The handover is one of the few documents the client will keep in a drawer forever. Your logo. Your colours. Your company information on every page. Cheap polish pays for itself.</p>

<h2>The role of software</h2>

<p>You don't strictly need software to produce a good handover document — but it makes the difference between "I will do this properly" and "I will actually do this properly."</p>

<p>The argument for using a portal like Builders Ready isn't that it produces the document at the end. It's that the document is being produced continuously throughout the project: every decision is logged the moment it's made, every variation is signed the moment it's agreed, every invoice is recorded the moment it's paid. At handover, the document is already there. You generate it in one click.</p>

<p>That removes the most common failure mode — the handover that never quite got finished — and it shifts the question from "do I have the energy to write this up?" to "do I want to send it now or after the snagging walkthrough?"</p>

<h2>The bottom line</h2>

<p>The handover document is the most professional artefact your business produces. It's the difference between being remembered as the builder who delivered the kitchen and being remembered as the builder who delivered the project. Spend the same care on it that you spent on the build itself.</p>
`,
  },
];
