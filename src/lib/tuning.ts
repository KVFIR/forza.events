/** i18n keys under `create.tuningTemplates.*` — keep order stable for chip layout. */
export const TUNING_RESTRICTION_TEMPLATE_KEYS = [
  'noForzaAero',
  'noEngineSwap',
  'noWidebodyKit',
  'noDrivetrainSwap',
  'stockTuneOnly',
  'oemPartsOnly',
  'noSlickTires',
  'noDragTires',
] as const;

export type TuningRestrictionTemplateKey = (typeof TUNING_RESTRICTION_TEMPLATE_KEYS)[number];
