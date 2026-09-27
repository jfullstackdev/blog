---
title: "My Thoughts on Codex and Claude"
date: 2026-09-27
slug: thoughts-on-codex-claude
description: "my thoughts on Codex and Claude models"
topics: [ai]
---

# My Thoughts on Codex and Claude

This is another article of mine on AI, this time on frontier models, 
including the older GPT-5.5 in Codex, as well as GPT-5.6 Luna, Terra, 
Sol, the latest GPT-6 Astra, and Claude Opus 5 and Fable 5.

Compared with what I last observed with Sonnet 4.5, I feel these models
have improved a lot. We are seeing more and more autonomy, with models
executing tasks well.

Also, this does not include the newer Fable 5.1 or even Mythos,
as I still haven't had a chance to use them in actual projects.

From what I'm seeing online, they still seem to fall short of AGI
expectations, though some claim they are early forms of AGI. Several weeks
have passed without much hype, so I wonder whether these are just another
round of frontier models that consume lots of tokens for a moderate
benefit.

These are my observations, though I'm not doing a statistical evaluation. 
This is not meant to be a benchmark or a definitive comparison of these models. 
It is mostly a record of my experience using them on real projects, along with 
some thoughts on what those experiences might mean for developers 
and for AI more broadly.

## Personal Projects with AI

I worked on around three personal projects using these frontier models, and
just like when Sonnet first arrived, I never really wrote even a single
line of code.

Still, I instruct each model as a dev, using specific rather than vague
prompts, knowing exactly what I expect the AI to do. Sometimes I let it
brainstorm and try its suggestions, but I'm still hands-on.

That's still a dev doing the work, not vibe coding or simply prompting it
to create a project. We still know what to build and how to build it.

It is good not only at coding but also at debugging and checking the health
of a running service, something we didn't do much before. Since we rely on
health checks, this is really useful.

It still doesn't write perfect code. During manual testing of my Trade
Helper app, I still found bugs in the code it produced, so it's still up to
me to understand exactly what's happening.

It also assumes too much or too little about things, since it is still not
at a human level. From time to time, I need to correct those assumptions.
Otherwise, it can easily modify what's already working and still be very
confident in doing so.

So, imagine this in real production. Mine is a moderate-sized project, or
even a small one, and it still introduced bugs, not just once but many
times. It's still dangerous if the dev does not know exactly what it is
doing.

Also, I realized that even though it is mostly written by AI, there is 
still so much to be done just to make it pass the initial publishing 
stage. And this is just a personal project.

I even documented the known limitations and the things I plan to address 
in the future, but I cannot trust any frontier model to handle all 
of them correctly at once.

## What AI Coding Agents Did Best

1. **Scripts.** A human could do this before, but would need to test each
   script to make sure it works. With so many scripts to run and check, a
   human would simply slow down. AI still needs to test its own scripts,
   but it can run those checks much faster.

2. **Chains of events.**

   - Whether reviewing a PR or investigating a bug, it can quickly carry
     out a series of steps that a human would have to run and check
     manually, using logs from each code path.
   - In a big codebase, this is beneficial because those checks can be very
     hard for humans, while AI can work through them to reach its findings.

3. **Mechanical tasks.** It's very good at mechanical tasks, such as
   resolving complicated merge conflicts, that would otherwise
   be time-consuming for humans. It also helps with formatting and syntax
   before linters and formatters even run.

## Observations and Limitations I've Encountered

The greatest limitation, as others have also observed, is how many tokens
these models consume. We know that gets costly, even for companies.

I personally tried ChatGPT Plus after using Go. At first, I wasn't
interested in trying these models on Go, but eventually I gave them a try.

With Terra Medium as the default, my Go allowance would barely last a few
prompts. Even for a simple PR review or medium tasks, it would not last
half a day.

I thought it was really unusable, but then I tried Luna Medium, or 
sometimes High, and my Go allowance lasted longer. A single medium task,
like reviewing a moderately sized PR, consumed only 1% of my monthly allowance.

So, for now, this approach still works: use higher reasoning settings and
top-level models for planning, debugging, and major tasks. Have them create
a detailed plan and task lists, then have Luna Medium execute the plan.

Also, do not underestimate Luna Medium. Others said it is as good as Sonnet
4.5 and can even match Opus in some ways. From my own use, I feel that's
really the case.

Without this technique, I don't think even my Plus subscription would last through
a day of coding. It's still costly when you're paying for it yourself.

Even big companies have felt the cost pressure. Uber reportedly burned through 
its annual AI budget by April, while Microsoft reportedly canceled most of 
its Claude Code licenses, partly over costs, and shifted developers toward 
GitHub Copilot CLI. I call it an "AI Budget Cut." 😅

## Comparison with Earlier Technologies

But to be fair, AI is not the first technology to need expensive
infrastructure before the benefits become clear. We saw this with
electricity, telecom networks, and cloud computing. Businesses also need
time to adjust how they work. So maybe AI is still in that stage, where the
spending comes first and the bigger benefits come later.

AI is also unusually costly because its infrastructure can become outdated
quickly as models and hardware improve. Companies are spending heavily on
specialized chips, data centres, electricity, and model training, while
newer generations of hardware can require further investment before the
previous spending has fully paid off. Earlier technologies also had
continuing costs, but the rapid pace of AI development may make it harder
for companies to recover these investments before another upgrade cycle
begins.

AI could follow a similar path. Better chips, more efficient models, and
wider adoption may eventually allow companies to get more value from the
same amount of spending. However, this is not guaranteed. AI may prove
more problematic if the cost of training and running advanced models
continues to rise, or if businesses do not gain enough productivity or
revenue to justify those costs. In that case, AI could still become an
important technology, while many of the companies investing heavily in it
struggle to earn back what they spent. Hence, the possibility of the AI
bubble popping remains.

## Humans Have the Final Say

Another technique I use is to have different models scan the same project,
or specific modules if the project is big, and compare their findings. They
don't always agree with each other. Even the same model can produce
different findings in different sessions.

This is a big issue: how could AI be fully automated if its findings vary
and even the severity ratings are inconsistent?

In these scans/reviews, I found Opus 5 very verbose, Fable more balanced, and
Terra more conservative. Sol, I feel, is a step up from Terra, but only for
larger or more demanding tasks.

But Terra being conservative might not always be good. That's why I use
different models: the differences emerge, they debate the findings, and I
finally settle on something.

For example, there was a recurring IP whitelisting error with my Trade
Helper app connecting to Coins.ph: IPv4 connections failed, while IPv6
worked. Despite repeated investigation and brainstorming, Terra did not
suggest anything to remedy it. Then Opus 5 suggested pinning it to IPv6,
and the recurring error disappeared.

Also, GPT-5.5 introduced a major bug in the Trade Helper app: the code 
it generated placed new exit orders for a coin when reconciliation 
failed. That’s kinda scary.

But as mentioned, an aggressive Opus 5 can be good at times when you need
it. It flags many issues that Terra and GPT-5.5 didn't raise.

I used GPT-6 Astra five times in different sessions to review the same app, 
my Trade Helper. Even though it was the same Astra, some findings were really 
different. It did not catch some issues in the first scan, raised new 
findings in later scans, and sometimes contradicted things the 
same Astra had raised earlier.

Running these five reviews used about 50% of my 5-hour limit and around 
10% of my weekly limit on my Plus subscription.

Also, I have them challenge each other's findings by pasting one model's
findings into another's session.

They eventually agree on some points, but the dev still has to settle 
the remaining disagreements. It still comes back to how good you are as a dev.

## What This Means for Us

We might be wondering whether coding is getting closer to its end, but a
lot is happening right now.

Anthropic’s CEO has called for slower AI development so safety measures and
oversight can keep pace with advancing capabilities. Elon Musk and OpenAI
CEO Sam Altman expressed support. This makes me wonder whether a similar
problem could emerge in dev workflows: AI produces code so quickly that
developers struggle to review and validate it.

Another possibility, though this is more speculative, is that AI is reaching
a point where further improvements become much harder without also making
the systems more dangerous.

If that happens, AI could become too costly for the benefits it delivers. It
may fail to deliver the expected agentic output and economic impact, while
investors become less willing to keep funding the enormous costs involved.

There is also another gap forming. New devs may find it harder to enter the
field while senior devs remain relevant. But what happens when there are not
enough newcomers gaining the experience needed to become the mid-level and
senior devs of the future?

Personally, I still don't feel these models are on par with human reasoning.
They can do many things they are well trained for, but I still don't see them
reasoning at a human level. So AGI might remain a dream unless something big
happens, such as a breakthrough fundamentally different from the way LLMs
work now.

Even if progress stalls, AI would not simply disappear. It could still become
the main tool for devs, possibly allowing fewer devs to do the same amount of
work. But that would still be different from the fully autonomous AI being
promised.

What remains uncertain is the role it will play, and I feel this could be a
turning point. We might see its direction more clearly in several months,
though my estimate is that it could take up to three years.

So, as I said in my older articles, I still think we're far from AGI.
