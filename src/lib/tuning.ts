/** Part / build restrictions hosts can attach to any event (general mode). */
export const TUNING_RESTRICTION_TEMPLATES = [
  'No Forza aero',
  'No engine swap',
  'No widebody kit',
  'No drivetrain swap',
  'Stock tune only',
  'No race tires',
  'Homologation parts only',
] as const;

export type CarSetupMode = 'general' | 'prescribed_tunes';

export const CAR_SETUP_MODE_LABELS: Record<CarSetupMode, string> = {
  general: 'Car list + general tuning rules',
  prescribed_tunes: 'Car list + tune code per car',
};
