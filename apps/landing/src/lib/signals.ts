import {
  BURST_WINDOW_DAYS,
  LOCAL_GUIDE_ESTABLISHED_LEVEL,
  NGRAM_SIZE,
  SHORT_TEXT_CHARS,
  SIGNAL_IDS,
  type SignalId,
} from '@signalyze/shared';

export interface SignalCopy {
  title: string;
  /** One factual sentence: what is measured, never what it implies. */
  description: string;
}

const COPY: Record<SignalId, SignalCopy> = {
  burst_ratio: {
    title: 'Burst ratio',
    description: `Share of reviews that fall into the single busiest ${BURST_WINDOW_DAYS}-day window, relative to the length of the place's review history.`,
  },
  rating_polarity: {
    title: 'Rating polarity',
    description:
      'How much the rating distribution is concentrated at 5 and 1 stars compared with 2 to 4 stars.',
  },
  single_review_accounts: {
    title: 'Single-review accounts',
    description:
      'Share of reviewers whose public profile shows one review or none besides this one.',
  },
  no_photo_short_text: {
    title: 'No photo, short text',
    description: `Share of reviews with no photo and fewer than ${SHORT_TEXT_CHARS} characters of text.`,
  },
  text_similarity: {
    title: 'Text similarity',
    description: `Average character ${NGRAM_SIZE}-gram overlap between review texts, and the share of near-duplicate pairs.`,
  },
  template_phrases: {
    title: 'Template phrases',
    description: 'How often the texts reuse stock phrases from a per-language dictionary.',
  },
  rating_text_mismatch: {
    title: 'Rating and text mismatch',
    description:
      'How often the tone of the text, measured with a lexicon, disagrees with the star rating.',
  },
  date_entropy: {
    title: 'Date entropy',
    description:
      'How evenly review dates are spread over time; low entropy means the dates are clustered.',
  },
  local_guide_ratio: {
    title: 'Local Guide ratio',
    description: `Share of reviewers with Local Guide level ${LOCAL_GUIDE_ESTABLISHED_LEVEL} or higher.`,
  },
  owner_response_pattern: {
    title: 'Owner response pattern',
    description: 'Share of reviews with an owner response, and how identical those responses are.',
  },
};

export interface SignalCard extends SignalCopy {
  id: SignalId;
}

/** All ten signals in canonical order, with landing-page copy. */
export const SIGNALS: readonly SignalCard[] = SIGNAL_IDS.map((id) => ({ id, ...COPY[id] }));
