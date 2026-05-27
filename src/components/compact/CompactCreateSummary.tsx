import {useTranslation} from 'react-i18next';
import {format} from 'date-fns';
import {dateFnsLocale} from '../../i18n/dateLocale';
import {eventTypeLabel} from '../../lib/eventTypes';
import {sectionLabelClass} from '../ui/formStyles';
import type {CreateEventFormValues} from '../../screens/CreateEvent/types';
import {PREVIEW_STEP_INDEX} from '../../screens/CreateEvent/constants';

type Props = {
  values: CreateEventFormValues;
  step: number;
  eventId: string | null;
  isPublished: boolean;
};

/** Read-only draft snapshot while Activity is in PIP / grid. */
export function CompactCreateSummary({values, step, eventId, isPublished}: Props) {
  const {t} = useTranslation();
  const title = values.title.trim() || t('discordLayout.untitledDraft');
  const when = values.startsAtLocal
    ? format(new Date(values.startsAtLocal), 'EEE d MMM · HH:mm', {locale: dateFnsLocale()})
    : t('common.notSet');

  return (
    <div className="mb-3 rounded-lg border border-white/[0.08] bg-card/90 px-3 py-2.5 text-left">
      <p className={sectionLabelClass}>
        {isPublished
          ? t('discordLayout.editingPublished')
          : eventId
            ? t('discordLayout.draftInProgress')
            : t('discordLayout.newDraft')}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-slate-300">
        {eventTypeLabel(values.type)} · {when}
      </p>
      <p className="mt-1 text-[10px] text-muted">
        {t('discordLayout.createStep', {
          current: step + 1,
          total: PREVIEW_STEP_INDEX + 1,
        })}
      </p>
    </div>
  );
}
