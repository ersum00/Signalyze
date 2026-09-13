/**
 * English site copy. This file defines the key set; every other locale must
 * provide exactly these keys (checked by TypeScript and at build time in
 * ./index.ts). Placeholders in braces are filled by `t()`.
 */
export const en = {
  'nav.methodology': 'Methodology',
  'nav.privacy': 'Privacy',
  'nav.changelog': 'Changelog',
  'nav.addToChrome': 'Add to Chrome',
  'nav.skip': 'Skip to content',
  'nav.main': 'Main',
  'nav.language': 'Language',

  'meta.home.title': 'Signalyze: a statistical Review Profile for any Google Maps business',
  'meta.home.description':
    'A free Chrome extension that shows a statistical Review Profile for any Google Maps business: ten measurable signals combined into a 0 to 100 Signalyze Score. No account, no tracking.',
  'meta.methodology.title': 'Methodology',
  'meta.methodology.description':
    'How each of the ten Signalyze signals and the 0 to 100 Signalyze Score are computed, with formulas, thresholds and weights.',
  'meta.privacy.title': 'Privacy',
  'meta.privacy.description':
    'Exactly what the Signalyze extension and API do with data: what is sent, what is never sent, what is stored and for how long.',
  'meta.changelog.title': 'Changelog',
  'meta.changelog.description': 'Release notes for the Signalyze extension, API and site.',
  'meta.notFound.title': 'Page not found',
  'meta.notFound.description': 'There is no page at this address.',

  'hero.eyebrow': 'free chrome extension · google maps',
  'hero.title': 'The statistics behind a star rating.',
  'hero.lead':
    'Signalyze turns the reviews already on a Google Maps page into a Review Profile: ten measurable signals, from timing bursts to text similarity, combined into a 0 to 100 Signalyze Score. No account, no tracking.',
  'hero.methodology': 'Read the methodology',
  'hero.storeSoon': 'Chrome Web Store listing coming soon.',
  'hero.readouts.label': 'Example signal readouts',
  'hero.readouts.eyebrow': 'what a signal looks like',
  'hero.readouts.burst': 'of reviews were posted within one {days}-day window',
  'hero.readouts.single': 'of reviewers have no other review',
  'hero.readouts.overlap': 'mean character {n}-gram overlap between review texts',
  'hero.readouts.note':
    'Statements about the distribution of public data. Anyone can recompute them from the same page.',

  'how.eyebrow': '3 steps',
  'how.title': 'How it works',
  'how.step1.title': 'Open a business on Google Maps',
  'how.step1.text':
    'Any place page with at least {min} reviews. Signalyze stays idle until you ask for it.',
  'how.step2.title': 'Click Analyze',
  'how.step2.text':
    'The extension scrolls the review panel Google has already rendered and reads up to {limit} reviews, or {extended} with "Load more". It never opens another page.',
  'how.step3.title': 'Read the Review Profile',
  'how.step3.text':
    'The side panel shows the score, the ten signals, reviews per month, the rating distribution and a reviewer summary, each explained in plain language.',

  'see.eyebrow': 'the side panel',
  'see.title': 'What you see',
  'see.score.title': 'Score and ten signals',
  'see.score.text':
    'A 0 to 100 Signalyze Score, and under it every signal with its value. Each one has a plain-language explanation and a link to its formula.',
  'see.monthly.title': 'Reviews per month',
  'see.monthly.text': 'How many reviews arrived each month, so a burst is visible at a glance.',
  'see.rating.title': 'Rating distribution',
  'see.rating.text':
    'How the stars are spread from 5 to 1. A shape concentrated at both ends looks different from a smooth one.',
  'see.reviewers.title': 'Reviewer profile',
  'see.reviewers.text':
    'How many reviewers have only this review, how many are established Local Guides, and how many posted no photo and little text.',

  'shots.eyebrow': 'screenshots',
  'shots.title': 'What it looks like',
  'shots.alt': 'Signalyze screenshot {n}',
  'shots.alt.score': 'The side panel with the Signalyze Score and the ten signals',
  'shots.alt.signals': 'A signal expanded to show its value and explanation',
  'shots.alt.charts': 'Reviews per month and rating distribution charts',
  'shots.alt.reviewers': 'The reviewer summary',
  'shots.alt.consent': 'The one-time consent screen before the first analysis',
  'shots.alt.settings': 'The settings screen',

  'signals.eyebrow': '10 signals · engine {version}',
  'signals.title': 'The ten signals',
  'signals.lead':
    'Each signal is a value between 0 and 1 that expresses how unusual the measured quantity is compared with typical reviewed places. Nothing is inferred about intent; every one is a fact about the distribution of public data.',
  'signals.more': 'Formulas, weights and thresholds: <a href="{url}">methodology</a>.',

  'signal.burst_ratio.title': 'Burst ratio',
  'signal.burst_ratio.description':
    "Share of reviews that fall into the single busiest {days}-day window, relative to the length of the place's review history.",
  'signal.rating_polarity.title': 'Rating polarity',
  'signal.rating_polarity.description':
    'How much the rating distribution is concentrated at 5 and 1 stars compared with 2 to 4 stars.',
  'signal.single_review_accounts.title': 'Single-review accounts',
  'signal.single_review_accounts.description':
    'Share of reviewers whose public profile shows one review or none besides this one.',
  'signal.no_photo_short_text.title': 'No photo, short text',
  'signal.no_photo_short_text.description':
    'Share of reviews with no photo and fewer than {chars} characters of text.',
  'signal.text_similarity.title': 'Text similarity',
  'signal.text_similarity.description':
    'Average character {n}-gram overlap between review texts, and the share of near-duplicate pairs.',
  'signal.template_phrases.title': 'Template phrases',
  'signal.template_phrases.description':
    'How often the texts reuse stock phrases from a per-language dictionary.',
  'signal.rating_text_mismatch.title': 'Rating and text mismatch',
  'signal.rating_text_mismatch.description':
    'How often the tone of the text, measured with a lexicon, disagrees with the star rating.',
  'signal.date_entropy.title': 'Date entropy',
  'signal.date_entropy.description':
    'How evenly review dates are spread over time; low entropy means the dates are clustered.',
  'signal.local_guide_ratio.title': 'Local Guide ratio',
  'signal.local_guide_ratio.description':
    'Share of reviewers with Local Guide level {level} or higher.',
  'signal.owner_response_pattern.title': 'Owner response pattern',
  'signal.owner_response_pattern.description':
    'Share of reviews with an owner response, and how identical those responses are.',

  'data.eyebrow': 'from docs/PRIVACY.md',
  'data.title': 'What it sends and what it never sends',
  'data.lead':
    'Nothing leaves your browser until you click Analyze, and only after you have accepted the one-time consent screen. Decline it and every analysis runs locally.',
  'data.sent.title': 'Sent, once per analysis',
  'data.sent.1': 'The place identifier from the page URL, used as a cache key.',
  'data.sent.2':
    'Per review: star rating, calendar day (no time of day), text, the reviewer’s public review count, photo count, Local Guide level if shown, and the owner response if any.',
  'data.sent.3':
    'Per review: a one-way hash of the reviewer id, the place id and a daily salt made in your browser, so distinct reviewers can be counted without knowing who they are.',
  'data.sent.4': 'The displayed total review count and overall rating.',
  'data.sent.5': 'Interface language and extension version.',
  'data.never.title': 'Never sent',
  'data.never.1':
    'Reviewer names, profile URLs, avatars, user ids or any other reviewer identifier.',
  'data.never.2': 'Your Google account, your name or your email address.',
  'data.never.3': 'Your browsing history, other tabs, cookies or local storage.',
  'data.never.4':
    'Your location. The API sees the request’s IP address as every web server does; it is used in memory for rate limiting and never stored.',
  'data.kept.title': 'Kept on the server',
  'data.kept.text':
    'The computed profile per place, for {days} days. Two daily counters with no identifiers.',
  'data.notStored.title': 'Never stored',
  'data.notStored.text': 'Review text, reviewer hashes and IP addresses.',
  'data.google.title': 'Never contacted',
  'data.google.text':
    'Google. The API makes no request to any Google service, enforced by a test and a runtime guard.',
  'data.more': 'Full details, field by field: <a href="{url}">privacy</a>.',

  'verdict.eyebrow': 'shown under every score',
  'verdict.title': 'It is not a verdict',
  'legal.summary':
    'This score is a statistical summary of public review data; it is not a claim about the business or any reviewer.',
  'legal.noClaim':
    'Signalyze makes no claim about the accuracy of any review and no claim about any business or reviewer.',
  'verdict.note1':
    'No letter grade and no pass or fail. A number from 0 to 100, always shown with the sentence above.',
  'verdict.note2':
    'Every signal is listed separately with its formula on the methodology page, so you can disagree with the weighting.',
  'verdict.note3':
    'Fewer than {min} reviews: no score at all, only "insufficient data". Small samples produce extreme ratios.',
  'verdict.note4':
    'No per-review labels, no flags, no reporting features and no comparisons between named businesses.',

  'faq.eyebrow': '5 questions',
  'faq.title': 'Frequently asked',
  'faq.1.q': 'Is it free?',
  'faq.1.a': 'Yes. Signalyze is free, with no premium tier and no ads.',
  'faq.2.q': 'Does it need an account?',
  'faq.2.a':
    'No. There are no accounts, no cookies, no analytics and no telemetry. The only thing the extension keeps is your settings and a local cache of profiles you have viewed, in your own browser.',
  'faq.3.q': 'Does it work offline?',
  'faq.3.a':
    'Yes. If the Signalyze API cannot be reached, or if you decline data sending, the same signal engine runs inside your browser. Those results are labelled "offline analysis" so you know they did not come from the shared cache.',
  'faq.4.q': 'Does it work on sites other than Google Maps?',
  'faq.4.a':
    'Not yet. Version 0.1 works on Google Maps business pages. Support for the Google Search knowledge panel is planned for Phase 2.',
  'faq.5.q': 'How is the score computed?',
  'faq.5.a':
    'Each signal is a number between 0 and 1 that says how unusual the measured value is compared with typical reviewed places. The Signalyze Score is a weighted combination of the signals that could be computed, on a 0 to 100 scale. Below {min} reviews no score is shown. Every formula and weight is on the <a href="{url}">methodology page</a>.',

  'cta.title': 'Read the profile, then decide.',
  'cta.text': 'Free, no account, nothing sent until you click Analyze.',
  'cta.storeSoon': 'Store listing coming soon.',

  'footer.github': 'GitHub',
  'footer.trademark':
    'Google Maps and Local Guide are trademarks of Google LLC and are mentioned only to describe where the extension works. Signalyze is not affiliated with Google.',

  'doc.source': 'source',
  'doc.changelogNote':
    'Release notes are kept in English only; the list below is the original document.',
  'doc.fallbackNote':
    'This page is not yet available in {language}; the English original is shown.',

  'notFound.eyebrow': '404',
  'notFound.title': 'Nothing at this address.',
  'notFound.text':
    'The page may have moved. Everything on this site is reachable from the home page.',
  'notFound.home': 'Go to the home page',

  'mock.example': 'example data',
  'mock.place': 'Harbour Street Bakery',
  'mock.placeMeta': '4.6 ★ · 1,240 reviews · 200 analysed',
  'mock.scoreLabel': 'Signalyze Score · 0 to 100',
  'mock.signals': 'Signals',
  'mock.monthly': 'Reviews per month',
  'mock.months': 'S O N D J F M A M J J A',
  'mock.monthlyNote': '40 of 80 reviews in the last year were posted within one {days}-day window.',
  'mock.rating': 'Rating distribution',
  'mock.reviewers': 'Reviewers',
  'mock.reviewers.single': 'one review only',
  'mock.reviewers.guides': 'Local Guide level {level}+',
  'mock.reviewers.noPhoto': 'no photo, short text',
  'mock.caption': 'Illustrative side panel. The place and every number are example data.',
};
