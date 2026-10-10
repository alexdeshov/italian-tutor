// Languages a profile can practice. Mirrors the `target_language` enum (migration 0005).
export const TARGET_LANGUAGES = ['it', 'en'] as const

export type TargetLanguage = (typeof TARGET_LANGUAGES)[number]

export const LANGUAGE_LABEL: Record<TargetLanguage, string> = {
  it: 'Итальянский',
  en: 'Английский',
}

export const TOPIC_PLACEHOLDER: Record<TargetLanguage, string> = {
  it: 'Например: заказ кофе в баре в Риме',
  en: 'Например: заселение в отель в Лондоне',
}

// Unknown / missing values fall back to Italian — every row created before 0005 is Italian.
export function toTargetLanguage(value: unknown): TargetLanguage {
  return value === 'en' ? 'en' : 'it'
}
