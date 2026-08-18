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
    slug: 'getting-started-with-a-client-portal',
    title: 'Getting started with a client portal: what changes on your next job',
    description:
      'Signing your building business up to a client portal takes minutes — but the change it makes to how you run a job is bigger than most builders expect. Here is what getting started actually involves, and the benefits that show up from day one.',
    publishedAt: '2026-08-03',
    readingTime: '7 min read',
    category: 'Getting Started',
    contentHtml: `
<p>There is a particular kind of procrastination that costs builders more than any other: knowing you should get more organised, and never quite starting. You mean to sort out a proper system for updates, decisions and invoices. Then a job kicks off, the phone starts going, and another six months disappear into a group chat.</p>

<p>The good news is that the gap between "I should do this" and "this is done" is much smaller than it looks. Getting set up on a client portal takes about the length of a tea break, and — unusually for business software — the benefits start on the very first job you use it for. This is a plain walk-through of what getting started actually involves, and what changes as a result.</p>

<h2>What "getting started" actually involves</h2>

<p>People imagine onboarding software is a project in itself. For a client portal built for builders, it isn't. Start to finish, it is four short steps:</p>

<ul>
  <li><strong>Sign up and start a free trial.</strong> A couple of minutes. With Builders Ready you get 14 days free to try it on a real job before you commit to anything.</li>
  <li><strong>Add your branding.</strong> Upload your logo and pick your colours. This matters more than it sounds: the app your client uses carries <em>your</em> name, not ours.</li>
  <li><strong>Create your first project.</strong> Name, address, the quoted figure and a rough set of stages. Two minutes.</li>
  <li><strong>Invite your client.</strong> They get a link, install the app from the App Store or Google Play, and they are in — looking at a project with your logo on it.</li>
</ul>

<p>That is the whole thing. You can be live on your next job in the time it takes to write a couple of quotes.</p>

<h2>Benefit one: you look established from the first tap</h2>

<p>The moment your client opens an app with your name and colours on it, something shifts. Most builders they have ever hired ran the job out of a WhatsApp group. You have handed them a branded app for their project. Before you have laid a brick, you look like the more organised, more established option — and in a market where homeowners are quietly terrified of picking the wrong builder, looking like a safe pair of hands is often what wins the job.</p>

<h2>Benefit two: decisions stop evaporating</h2>

<p>Every job is hundreds of small choices — tap finishes, tile options, paint colours — and the verbal ones evaporate the moment there is a disagreement. On a portal, you raise a decision with options and prices, the client taps to choose on their phone, and the choice is logged with their name, the time and the cost. Three months later there is nothing to argue about, because there is a record. (We wrote about why this is the cheapest insurance a builder can buy <a href="/blog/the-decision-log-cheapest-insurance-in-construction">here</a>.)</p>

<h2>Benefit three: variations get signed, not argued</h2>

<p>The single most expensive admin mistake in construction is the casually-agreed variation that turns into a dispute at invoice stage. A portal makes the variation a signed object: title, description, cost, time impact, and the client's signature on their phone <em>before</em> the work happens. The "I never agreed to that" conversation simply stops happening. (The full legal anatomy of a robust variation is <a href="/blog/legal-anatomy-of-a-construction-variation">here</a>.)</p>

<h2>Benefit four: the client stops chasing you</h2>

<p>A surprising amount of a builder's week goes on answering "any update?" — by call, by text, by the client's partner. When the client can open an app and see the live timeline, the last update and the next stage, those interruptions largely disappear. You post one update from the van and everyone who needs to know, knows. Your evenings stop being spent scrolling back through messages to work out where each job stands.</p>

<h2>Benefit five: the handover writes itself</h2>

<p>Because every decision, variation, update and invoice is captured the moment it happens, the end-of-project handover pack is already assembled by the time you get there. Instead of losing two days piecing a document together under pressure, you generate it in one click — a professional record the client keeps, that quietly earns you the next referral. (What belongs in a proper handover is covered <a href="/blog/how-to-write-a-project-handover-document">here</a>.)</p>

<h2>"But will my clients actually use it?"</h2>

<p>This is the first objection every builder raises, and it was a fair one in 2018. It is not now. Your clients already bank on an app, book their gym on an app, and split dinner bills on an app. A homeowner spending five figures with you will install your app the same way. If one genuinely won't, that reluctance tells you something useful about the relationship early — while it is still cheap to know.</p>

<h2>Is it worth it for a smaller builder?</h2>

<p>Arguably more than for a large one. A single disputed £500 variation on a £20k bathroom that you cannot prove was agreed hurts far more, proportionally, than the same dispute on a £400k extension. At £29 a month, one avoided dispute a year pays for the tool several times over. The point of getting started is not the software — it is removing the admin friction that was quietly costing you money and evenings.</p>

<h2>Getting the most out of your first week</h2>

<ul>
  <li><strong>Mention it when you quote.</strong> "You will get your own app to follow the whole job" is a genuine differentiator at the exact moment a homeowner is comparing you to two other builders.</li>
  <li><strong>Invite the client at the start,</strong> not halfway through — the earlier they are in, the more the record is worth.</li>
  <li><strong>Post one update in the first few days</strong> so the client sees it working and gets the habit of checking the app.</li>
  <li><strong>Raise your first decision through it,</strong> even a small one, to set the pattern for the rest of the job.</li>
</ul>

<h2>The bottom line</h2>

<p>Getting started is not the hard part. It takes minutes, Builders Ready is free for 14 days, and it is live on both the App Store and Google Play. The hard part was always the admin you were doing by hand — the lost decisions, the argued variations, the handover that never quite got finished — and that is exactly the part getting set up removes. Start it on your next job, invite your first client, and let the first handover pack write itself. You can <a href="/signup">start your free trial here</a>.</p>
`,
  },
  {
    slug: 'turning-finished-jobs-into-a-portfolio',
    title: 'Turning finished jobs into your best sales tool: building a portfolio',
    description:
      'Every job you complete is proof of what you can do — but most builders let that proof disappear the moment they hand over the keys. Here is how to turn finished projects into a portfolio that wins the next one.',
    publishedAt: '2026-07-27',
    readingTime: '6 min read',
    category: 'Growth',
    contentHtml: `
<p>Ask most builders how they win work and they will say "word of mouth" — which is true, and also a polite way of saying "I hope the phone rings." Referrals are the best source of work in construction, but they are passive. You cannot control when a past client happens to mention you at a dinner party.</p>

<p>What you <em>can</em> control is the evidence you keep of your own work. Every job you finish is proof — of your quality, your organisation, your reliability. Yet most of that proof evaporates the moment you hand over the keys: the photos stay buried on a phone, the paperwork gets scattered, and the story of how well the project ran is never told to anyone but the client who already knows it.</p>

<h2>Why a portfolio matters more than you think</h2>

<p>When a homeowner is choosing a builder, they are making a high-stakes decision with very little to go on. They cannot inspect the quality of a job you did last year. They cannot see how you handled the variations or whether you finished on time. All they have is your quote, your manner, and whatever proof you put in front of them. The builder with the strongest, most tangible proof reduces the homeowner's fear — and fear is the main thing standing between you and the job.</p>

<h2>What actually belongs in a builder's portfolio</h2>

<ul>
  <li><strong>Before, during and after photos.</strong> The "during" shots matter most — steels, first fix, concealed work — because they prove competence a finished photo never can.</li>
  <li><strong>The story of the project,</strong> not just the look of it: the timeline, the stages, how changes were handled.</li>
  <li><strong>Evidence of organisation</strong> — a clean handover pack, signed variations, a clear finance record. This is what proves you are not a cowboy, which is precisely the fear you are fighting.</li>
  <li><strong>The outcome</strong> — a finished space, a happy client, ideally a line in their own words.</li>
</ul>

<h2>Capture it as you go, not at the end</h2>

<p>The reason most builders have no portfolio is that they try to build it retrospectively — trawling back through a year of photos when they finally need one. It never happens. The trick is to let the portfolio assemble itself while the job runs: photograph each stage as you post updates, keep the decisions and variations logged, and let the finished handover pack become the portfolio entry. By the time the job is done, the material is already there.</p>

<h2>Turn one job into months of marketing</h2>

<p>A single well-documented project can become a case study on your website, a before-and-after post on Instagram, a set of progress clips for TikTok, and a document you show the next prospect on your phone in their kitchen. You did the work once; the proof should work for you many times over.</p>

<h2>The compounding effect</h2>

<p>A portfolio, unlike a one-off advert, compounds. Every finished job adds another piece of proof, and the more proof you have, the easier the next job is to win — which produces another piece of proof. Builders who document consistently find that after a year or two they barely need to sell; the evidence does it for them.</p>

<p>This is the quiet second benefit of running jobs through a client portal. Because Builders Ready logs every update, photo, decision and variation as the job runs and rolls them into a branded <a href="/blog/how-to-write-a-project-handover-document">handover pack</a> at the end, each finished project leaves you with a ready-made portfolio entry — not a pile of screenshots to sort out later. Whatever tool you use, the rule is the same: capture the proof while you have it, because a finished job you cannot show is a sale you cannot make twice.</p>
`,
  },
  {
    slug: 'how-to-handle-a-difficult-client',
    title: 'How to handle a difficult client without losing the job',
    description:
      'Every builder gets one eventually — the client who queries everything, changes their mind, or goes quiet at payment time. Here is how to manage a difficult client professionally, protect your margin, and often turn them around.',
    publishedAt: '2026-07-20',
    readingTime: '6 min read',
    category: 'Operations',
    contentHtml: `
<p>Every builder gets one eventually: the client who questions every line, changes their mind twice a week, adds their opinionated brother-in-law to every conversation, or goes suspiciously quiet the moment an invoice lands. A difficult client can turn a profitable job into a stressful, margin-eroding slog — and how you handle them often decides whether you finish with a payment and a reference, or a dispute.</p>

<p>The instinct is to either cave to keep the peace or dig in and fight. Both usually make it worse. Here is a calmer approach.</p>

<h2>Most "difficult" clients are actually anxious</h2>

<p>Start from the right diagnosis. The majority of difficult behaviour on domestic jobs is not malice — it is anxiety. The client is spending a frightening amount of money on something they do not fully understand, in their own home, with someone who was a stranger a few weeks ago. Querying everything, hovering and second-guessing are what anxiety looks like. Once you see it that way, the remedy becomes obvious: reduce the anxiety, and most of the difficulty goes with it.</p>

<h2>Transparency defuses more than reassurance</h2>

<p>Telling an anxious client "don't worry, it's all in hand" rarely works — it asks them to trust a feeling. Showing them works far better. A client who can see the timeline, the decisions they have made, the agreed costs and the running total has far less to be anxious about, because uncertainty is the fuel. Visibility is a management tool, not just a courtesy.</p>

<h2>Get everything in writing — kindly</h2>

<p>The difficult client is precisely the one with whom verbal agreements will come back to bite you. Every decision, every change and every cost needs to be recorded and confirmed by them — not as an act of hostility, but as normal practice you apply to everyone. "I'll pop that change in the system and you can approve it on your phone" is not confrontational; it is professional, and it quietly builds the record that protects you if the relationship sours.</p>

<h2>Separate genuine issues from moving goalposts</h2>

<p>Some complaints are real defects you should fix promptly and without fuss. Others are changes of mind dressed up as problems — a <a href="/blog/legal-anatomy-of-a-construction-variation">variation</a> in disguise. Learning to tell them apart, and to price the changes of mind kindly but clearly at the moment they arise, is most of the battle. A client who is used to every change being logged and costed stops treating "while you're here, can you just…" as free.</p>

<h2>Hold the line on payment</h2>

<p>Invoice against visible progress, and a client who has watched the work unfold has far less room to stall. Chase politely but immediately — the longer an invoice ages, the harder it is to collect, and a difficult client will read hesitation as an opening.</p>

<h2>When to walk away</h2>

<p>Occasionally a client is not anxious but genuinely unreasonable, and no amount of communication will fix it. This is rare, but real. A clear, documented paper trail is also what lets you exit cleanly if you have to — protecting your reputation and your right to be paid for work done.</p>

<p>The common thread: difficult clients are managed with visibility and documentation, not charm or confrontation. The timeline, decisions, variations and finance a client can see in Builders Ready are the very same records that protect you if things go wrong. Whatever you use, show them everything, and write everything down.</p>
`,
  },
  {
    slug: 'the-8-stages-of-a-build',
    title: 'The 8 standard stages of a build — a simple timeline any builder can use',
    description:
      'A clear, staged timeline is the simplest way to keep a project on track and a client calm. Here are the 8 stages most residential builds follow, and how to use them to manage the job and the client.',
    publishedAt: '2026-07-13',
    readingTime: '6 min read',
    category: 'Operations',
    contentHtml: `
<p>To a builder, the order of a job is obvious — it lives in your head and your hands. To a client, a build looks like chaos: skips, dust, trades coming and going, and long stretches where nothing visibly changes. Most of the anxiety a client feels comes from not being able to tell whether things are on track. A simple, staged timeline fixes that, and it makes the job easier to run at the same time.</p>

<p>Here are the eight stages most residential projects follow, and how to use them.</p>

<h2>Why stages matter beyond project management</h2>

<p>Breaking a job into named stages does three jobs at once. It gives you natural milestones to tie stage payments to (far easier to justify than dates). It gives the client a map, so they can see where they are and what comes next. And it gives you an early-warning system: if a stage runs long, you know before it becomes a crisis.</p>

<h2>The eight stages</h2>

<h3>1. Mobilisation</h3>
<p>Setting up: permits confirmed, skips and welfare on site, materials ordered, programme agreed. Boring, but the stage where good jobs are quietly won.</p>

<h3>2. Strip-out and demolition</h3>
<p>Removing what is coming out. Fast and visible — a good moment for the client to see obvious progress early and build confidence.</p>

<h3>3. Structure</h3>
<p>The bones: foundations, steels, walls, roof structure. This is where concealed work happens, so photograph everything before it is covered — it protects you and it is gold for a future surveyor.</p>

<h3>4. First fix</h3>
<p>Everything that goes in before plaster: electrical and plumbing rough-in, carcassing, insulation. Pressure-test and certificate as you go.</p>

<h3>5. Plastering</h3>
<p>Walls and ceilings skimmed, then a drying-out period. A stage clients often underestimate — worth flagging the wait so it does not read as a delay.</p>

<h3>6. Second fix</h3>
<p>The visible trades return: sockets and switches, sanitaryware, kitchen, doors, skirting. The job starts to look finished, and client excitement (and opinions) tend to spike here.</p>

<h3>7. Decoration and finishes</h3>
<p>Paint, tiling, flooring, the details. The stage where a good finish earns the referral and a rushed one loses it.</p>

<h3>8. Handover and completion</h3>
<p>Snagging, sign-off, certificates and the handover pack. The most important stage for your business, and the one most builders treat as an afterthought.</p>

<h2>Using stages to manage the client</h2>

<p>Once the job is staged, communication almost writes itself. "We have finished first fix and move to plastering next week" tells the client more, and reassures them more, than any amount of "it's all going well." Tie your invoices to stage completion, post an update as each stage closes, and the client always knows where they stand — which means they stop asking.</p>

<p>These are the exact eight stages the Builders Ready timeline is built around, so your client sees each one tick from "not started" to "complete" on their phone. But the stages are not ours — they are the industry's. Adopt them in whatever form you like; a job the client can follow stage by stage is a job that runs calmer for everyone.</p>
`,
  },
  {
    slug: 'why-homeowners-choose-one-builder-over-another',
    title: 'Why homeowners choose one builder over another: it is not just price',
    description:
      'Builders assume they win or lose on price. Homeowners rarely decide that way. Here is what actually drives the decision — and how to be the builder who gets picked.',
    publishedAt: '2026-07-06',
    readingTime: '6 min read',
    category: 'Industry',
    contentHtml: `
<p>Most builders believe they win and lose jobs on price. It is a comforting theory, because it means losing is out of your hands. It is also mostly wrong. When two builders quote within a sensible range of each other, homeowners very rarely pick the cheaper one. They pick the one they trust more — and trust is something you can actually influence.</p>

<h2>What the homeowner is really deciding</h2>

<p>Put yourself in their position. They are about to hand a large sum of money to someone to do work they cannot judge, in the home they live in, over several months. They have all heard a horror story — the job that overran, the builder who went quiet, the bill that doubled. So underneath "who is cheapest" is a much bigger question: <em>who is least likely to do that to me?</em> The quote is just one clue they use to answer it.</p>

<h2>The signals that actually move the decision</h2>

<ul>
  <li><strong>Responsiveness.</strong> The builder who replies promptly and clearly during the quoting stage is assumed to behave the same way during the job. Slow, vague replies now read as a warning.</li>
  <li><strong>Organisation.</strong> A tidy quote, a clear breakdown, a sense that you have a system — all of it signals that the job itself will be run properly.</li>
  <li><strong>Proof.</strong> Photos, references, a portfolio, a documented past job. Tangible evidence beats claims every time.</li>
  <li><strong>Transparency.</strong> A builder who volunteers how changes and costs will be handled feels safe. One who is vague about money feels risky.</li>
</ul>

<h2>Price is often a proxy for trust</h2>

<p>Here is the counter-intuitive part: when a homeowner does choose on price, it is frequently because nothing else gave them a reason not to. If two builders feel equally uncertain, price is the only tie-breaker left. Give them a stronger reason — visible organisation, proof, a clear picture of how you work — and price quietly stops being the deciding factor.</p>

<h2>How to be the builder who gets picked</h2>

<p>You do not need to be the cheapest or the biggest. You need to be the one who most obviously reduces the homeowner's fear. Reply quickly. Show them a past job in detail. Explain, before they ask, exactly how you will keep them updated, how decisions get made, and how any extra costs will be agreed. If you can show them that their project will run on a proper system — where they can see progress and sign off changes — you have answered the only question that really mattered.</p>

<p>This is the whole idea behind giving each client their own branded app: it turns "trust me" into "look." A homeowner who can see how organised the job will be, before they have committed a penny, is a homeowner who has already half-decided. Whatever tools you use, compete on trust, not just on price — because trust is the thing they are actually buying.</p>
`,
  },
  {
    slug: 'how-much-to-charge-for-variations',
    title: 'How much should a builder charge for variations and extras?',
    description:
      'Underpricing extras quietly kills margin; overpricing sparks disputes. Here is a sensible way to price variations on domestic work — and how to present them so they get agreed without a row.',
    publishedAt: '2026-06-29',
    readingTime: '6 min read',
    category: 'Finance',
    contentHtml: `
<p>Variations are where a lot of builders quietly lose money. Not through one big mistake, but through a hundred small extras that were underpriced, done as favours, or never charged for at all. "While you're here, can you just…" is one of the most expensive sentences in construction — because the honest, obliging builder absorbs it, and the margin disappears a favour at a time.</p>

<p>The fix is a simple, consistent way to price extras, and a professional way to present them.</p>

<h2>Price the whole cost, not just the materials</h2>

<p>The most common underpricing mistake is charging for the extra tap or the extra socket but not for the time, disruption and knock-on work it creates. A "quick" change on site rarely is. Price a variation as: the materials, the labour to fit it, any consequential work it triggers, and a fair margin — the same margin you would apply to the original job. An extra is not a charity; it is work, and it should carry your normal markup.</p>

<h2>Do not do extras for free to "keep them sweet"</h2>

<p>Builders often waive small extras hoping to bank goodwill. It rarely works the way you hope. Free extras teach the client that changes cost nothing, which invites more of them, and they set an expectation that becomes awkward to reverse when a bigger one comes along. Charging fairly and consistently is not mean — it is what a professional does, and clients respect it more than they resent it.</p>

<h2>Always include the time impact</h2>

<p>Cost is only half of a variation. A change that adds two days to the programme needs to say so at the point of agreement, not at the end. The omission of a timeline impact is one of the most common sources of dispute, because clients assume extras are cost-only and feel misled when a job overruns. State "+£X, +Y days" every time.</p>

<h2>Present the price before the work, not after</h2>

<p>This is the single biggest lever, and it is about psychology as much as numbers. The same £300 extra that causes a row when it appears on the final invoice is accepted without a murmur when the client agrees it in advance. Show the cost, get them to approve it, then do the work. A client who chose the upgrade knowing the price owns the decision; a client who discovers it later feels ambushed. The money did not change — the framing did. (The legal side of getting this right is covered in <a href="/blog/legal-anatomy-of-a-construction-variation">the anatomy of a variation</a>.)</p>

<h2>Keep a running total the client can see</h2>

<p>Individual variations rarely cause "final account shock" — the cumulative effect does. Fifteen small extras totalling several thousand pounds the client never tracked will feel like an ambush at the end, even when each was agreed. A visible running total — original quote plus variations to date — removes the shock entirely, because the number was never hidden.</p>

<p>Builders Ready is built around exactly this: you propose a variation with a title, cost and time impact, the client signs it off on their phone before the work, and it flows into a live finance summary both of you can see. But the principle stands whatever you use — price the whole cost, include the time, get it agreed up front, and never let the total be a surprise.</p>
`,
  },
  {
    slug: 'deposits-and-stage-payments-domestic-building-work',
    title: 'Deposits and stage payments on domestic building work: how to structure them',
    description:
      'Get your payment structure right and cash flow takes care of itself; get it wrong and you end up funding the job out of your own pocket. Here is how to structure deposits and stage payments on domestic jobs.',
    publishedAt: '2026-06-22',
    readingTime: '7 min read',
    category: 'Finance',
    contentHtml: `
<p>On domestic building work, how you structure payments matters as much as how much you charge. Get it right and cash flow largely looks after itself. Get it wrong and you end up funding the client's project out of your own pocket — buying materials and paying wages weeks before the money to cover them arrives. That gap is where otherwise healthy firms get into trouble.</p>

<p>Here is a sensible way to structure deposits and stage payments on domestic jobs.</p>

<h2>The deposit: proportionate, not punitive</h2>

<p>A deposit does two things: it confirms the client is committed, and it funds the initial materials so you are not out of pocket from day one. Keep it proportionate. A modest deposit against confirmed material orders is reasonable and normal. An excessive up-front demand frightens good clients and can fall foul of consumer protection rules, which look unfavourably on large payments taken far ahead of work. As a rule of thumb, the deposit should cover what you genuinely need to commit before starting, not sit as a large cushion in your account.</p>

<h2>Stage payments: tie them to milestones, not dates</h2>

<p>The biggest single improvement most builders can make is to bill against verifiable milestones rather than the calendar. "On completion of first fix" is something both parties can look at and agree has happened. "Week four" is not, because weeks slip, and a date-based schedule invites an argument every time the programme moves. Milestones remove that friction because the trigger is visible.</p>

<h2>Keep the stages small</h2>

<p>Frequent, smaller invoices beat a few large ones for two reasons. They smooth your cash flow, so you are never far ahead of your costs. And they shrink the size of any single dispute — a client querying a £3,000 stage payment is a much smaller problem than one querying a £30,000 final bill. Small and often keeps everyone calmer.</p>

<h2>Put the schedule in writing before you start</h2>

<p>On domestic jobs this matters more than most builders realise. The statutory payment protections in the Construction Act specifically exclude work for a "residential occupier" — a homeowner having work done on their own home. So on a typical domestic job, your right to be paid, and when, comes almost entirely from the contract you agreed, not from statute. A clear, written payment schedule the client has seen and accepted is therefore your main protection, not a formality. (We go deeper on the legal side in <a href="/blog/getting-paid-on-time-uk-builders">getting paid on time</a>.)</p>

<h2>Retention: usually not worth it on domestic work</h2>

<p>On larger and commercial jobs, clients sometimes hold a small percentage of each payment as "retention," released after a defects period. It is far less common on domestic work, and usually not worth introducing — it parks your money and a meaningful share of retained sums are never released without chasing. If a domestic client asks for it, make sure the release terms and date are written down and diarised.</p>

<h2>Make the money visible as you go</h2>

<p>Clients pay faster when they can see what they are paying for. An invoice that lands cold, with a number the client cannot reconcile, gets queried. An invoice that arrives against a backdrop of visible progress and agreed costs gets paid, because it is the expected conclusion of a story the client already believes.</p>

<p>This is why Builders Ready keeps a live finance summary — quoted, invoiced, paid, outstanding — visible to both you and the client, with invoices tied to the project they have been watching. But the structure comes first: proportionate deposit, small milestone-based stages, and a written schedule agreed before a brick is laid. Get that right and you stop being your client's bank.</p>
`,
  },
  {
    slug: 'keeping-clients-updated-without-whatsapp',
    title: 'How to keep clients updated without living on WhatsApp',
    description:
      'Clients want to feel informed; builders do not want to spend their evenings answering messages. Here is how to keep clients well updated without the group chat taking over your life.',
    publishedAt: '2026-06-15',
    readingTime: '5 min read',
    category: 'Operations',
    contentHtml: `
<p>Every builder feels the same tension. Clients who are kept in the loop are happier, pay faster and recommend you more. But keeping them in the loop usually means WhatsApp, and WhatsApp means your evenings, your weekends and your headspace being colonised by "any update?" and photo requests. Good communication should not cost you your personal life. Here is how to get the first without the second.</p>

<h2>Update proactively so they never have to chase</h2>

<p>Almost all the interrupting messages a client sends come from one root cause: they do not know what is happening, so they ask. Flip it. A short, proactive update at the end of each stage — a line of text and a photo — pre-empts the questions before they are asked. Counter-intuitively, telling clients <em>more</em>, on your schedule, means they contact you <em>less</em>, on theirs.</p>

<h2>Pick one channel and hold the line</h2>

<p>The chaos multiplies when updates are scattered across WhatsApp, email, text and the odd phone call. Something is always agreed on the channel you are not looking at. Choose a single place where project communication lives, and gently steer everything there. "I post all the updates in one place so nothing gets lost" is a reasonable, professional thing to say — and it stops you being on call across five apps.</p>

<h2>Let photos do the talking</h2>

<p>A photo of the finished plastering says more, and reassures more, than three paragraphs of explanation — and it takes ten seconds to send from the van. Progress photos are the highest-value, lowest-effort update you can give, and they double as a record of concealed work you will be glad of later.</p>

<h2>Set the rhythm early</h2>

<p>Tell the client at the start how updates will work: "I'll post an update at the end of each stage, and you can see the timeline any time." Once the rhythm is set, the client relaxes into it. It is the absence of a rhythm — silence, then a flurry — that makes clients anxious and pushy.</p>

<h2>Keep the group chat off your phone at 9pm</h2>

<p>The real cost of WhatsApp is not the messages; it is that they arrive on the same phone, in the same app, as your family and your friends, at all hours. Moving project communication into a dedicated space is partly about organisation and partly about giving yourself a boundary — a place work lives that you can choose to close.</p>

<p>This is a large part of why builders move to a client portal: the client gets a live timeline and updates they can check themselves, so they stop chasing, and you get your evenings back. We wrote about that shift in more detail in <a href="/blog/why-builders-are-abandoning-whatsapp">why builders are leaving WhatsApp</a>. Whatever you use, the principles are the same — update proactively, keep it to one channel, and let the client see for themselves.</p>
`,
  },
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
