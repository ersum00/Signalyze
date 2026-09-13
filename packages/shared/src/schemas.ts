import { z } from 'zod';
import { MAX_REVIEWS_PER_REQUEST, SUPPORTED_LOCALES } from './constants';
import { SIGNAL_IDS } from './signal-definitions';

/** ISO calendar day, e.g. "2026-03-14". Day precision only; no time of day is ever sent. */
export const IsoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'invalid calendar day');

/** 64 hex chars: sha256(reviewerId + placeId + dailySalt), produced on the client. */
export const ReviewerHashSchema = z.string().regex(/^[0-9a-f]{64}$/, 'expected sha256 hex');

/**
 * A single review as sent to the API. By design this contains no reviewer name,
 * profile URL, avatar or user id. See docs/PRIVACY.md.
 */
export const ReviewSchema = z.object({
  reviewerHash: ReviewerHashSchema,
  rating: z.number().int().min(1).max(5),
  /** Calendar day the review was posted (client-side best effort from relative dates). */
  date: IsoDaySchema,
  /** Review text; may be empty. Truncated client-side to 2000 chars. */
  text: z.string().max(2000),
  /** Reviewer's total review count as shown by Google, if visible. */
  reviewerReviewCount: z.number().int().min(0).nullable(),
  /** Number of photos attached to this review. */
  photoCount: z.number().int().min(0),
  /** Local Guide level if shown, else null. */
  localGuideLevel: z.number().int().min(1).max(10).nullable(),
  /** Owner response text, if any. Only used for the owner_response_pattern signal. */
  ownerResponse: z.string().max(2000).nullable(),
  /** BCP-47 language tag detected client-side, if any. */
  language: z.string().max(10).nullable(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const PlaceIdSchema = z
  .string()
  .min(4)
  .max(512)
  .regex(/^[A-Za-z0-9_:\-.!]+$/, 'unexpected place id characters');

export const AnalysisRequestSchema = z.object({
  placeId: PlaceIdSchema,
  reviews: z.array(ReviewSchema).min(1).max(MAX_REVIEWS_PER_REQUEST),
  /** Total review count displayed by Google for the place, if visible. */
  totalReviewCount: z.number().int().min(0).nullable(),
  /** Overall rating displayed by Google, if visible. */
  overallRating: z.number().min(1).max(5).nullable(),
  /** UI locale, used only to pick a template-phrase dictionary hint. */
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
  /** Client version, for compatibility handling. */
  clientVersion: z.string().max(32),
});
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type AnalysisRequestInput = z.input<typeof AnalysisRequestSchema>;

export const SignalIdSchema = z.enum(SIGNAL_IDS);

export const SignalDetailValueSchema = z.union([z.number(), z.string(), z.boolean(), z.null()]);
export type SignalDetailValue = z.infer<typeof SignalDetailValueSchema>;

export const SignalResultSchema = z.object({
  id: SignalIdSchema,
  /** 0..1 unusualness. 0 = matches typical reviewed places, 1 = highly unusual. */
  unusualness: z.number().min(0).max(1),
  /** Raw measured value (ratio, score or count depending on the signal). */
  value: z.number(),
  /** Machine-readable details used to render the human explanation via i18n. */
  details: z.record(z.string(), SignalDetailValueSchema),
  /** Whether enough data was available to compute this signal. */
  available: z.boolean(),
});
export type SignalResult = z.infer<typeof SignalResultSchema>;

export const MonthlyCountSchema = z.object({
  /** "YYYY-MM" */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  count: z.number().int().min(0),
});
export type MonthlyCount = z.infer<typeof MonthlyCountSchema>;

export const RatingDistributionSchema = z.object({
  1: z.number().int().min(0),
  2: z.number().int().min(0),
  3: z.number().int().min(0),
  4: z.number().int().min(0),
  5: z.number().int().min(0),
});
export type RatingDistribution = z.infer<typeof RatingDistributionSchema>;

export const ReviewerProfileSummarySchema = z.object({
  singleReviewShare: z.number().min(0).max(1).nullable(),
  medianReviewCount: z.number().min(0).nullable(),
  localGuideShare: z.number().min(0).max(1).nullable(),
  withPhotosShare: z.number().min(0).max(1),
});
export type ReviewerProfileSummary = z.infer<typeof ReviewerProfileSummarySchema>;

export const AnalysisResultSchema = z.object({
  placeId: PlaceIdSchema,
  /** 0..100 Signalyze Score, or null when reviewCount < MIN_REVIEWS_FOR_SCORE. */
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(['ok', 'insufficient_data']),
  reviewCount: z.number().int().min(0),
  signals: z.array(SignalResultSchema),
  monthly: z.array(MonthlyCountSchema),
  ratingDistribution: RatingDistributionSchema,
  reviewerProfile: ReviewerProfileSummarySchema,
  /** Where the computation happened. */
  source: z.enum(['server', 'server-cache', 'offline']),
  engineVersion: z.string(),
  computedAt: z.string().datetime(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  engineVersion: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
