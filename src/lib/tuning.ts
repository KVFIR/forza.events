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

export type CarSetupMode = 'general' | 'prescribed_tunes';

export const CAR_SETUP_MODE_LABELS: Record<CarSetupMode, string> = {
  general: 'Car list + general tuning rules',
  prescribed_tunes: 'Car list + tune code per car',
};
