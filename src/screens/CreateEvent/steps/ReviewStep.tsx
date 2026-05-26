import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Calendar, Hash, MapPin, Users} from 'lucide-react';
import {Alert} from '../../../components/ui/Alert';
import {Badge, CarRuleBadge} from '../../../components/ui/Badge';
import {Panel} from '../../../components/ui/Panel';
import {TextButton} from '../../../components/ui/TextButton';
import {EventCover} from '../../../components/EventCover';
import {defaultCoverPath} from '../../../lib/eventCovers';
import {defaultTimezone, formatEventTime, localInputToUtc} from '../../../lib/datetime';
import type {CarRuleMode, EventType} from '../../../lib/types';
import {formatMaxPi} from '../../../lib/pi';
import {sectionLabelClass} from '../../../components/ui/formStyles';
import type {CreateEventStepIndex} from '../constants';

export type PublishGap = {
  message: string;
  step: CreateEventStepIndex;
};

type Props = {
  title: string;
  description: string;
  type: EventType;
  startsAtLocal: string;
  coverPreview: string | null;
  targetGuildName: string;
  targetChannelId: string;
  normalizedTrackCodes: string[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  carCount: number;
  lobbyLeaderLabel: string;
  missingForPublish: PublishGap[];
  isPublished?: boolean;
  isEditMode?: boolean;
  onJumpToStep?: (step: CreateEventStepIndex) => void;
};

function ReviewSection({title, children}: {title: string; children: ReactNode}) {
  return (
    <section className="px-4 py-3">
      <h3 className={sectionLabelClass}>{title}</h3>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  );
}

function ReviewFact({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: typeof Calendar;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex gap-2.5">
      {Icon ? (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
          <Icon className="h-3.5 w-3.5 text-muted-light" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-0.5 text-sm text-slate-200">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export function ReviewStep({
  title,
  description,
  type,
  startsAtLocal,
  coverPreview,
  targetGuildName,
  targetChannelId,
  normalizedTrackCodes,
  carRuleMode,
  maxPi,
  carCount,
  lobbyLeaderLabel,
  missingForPublish,
  isPublished = false,
  isEditMode = false,
  onJumpToStep,
}: Props) {
  const {t} = useTranslation();
  const when =
    startsAtLocal
      ? formatEventTime(localInputToUtc(startsAtLocal, defaultTimezone()), defaultTimezone())
      : null;
  const carRules =
    carRuleMode === 'anything_goes'
      ? t('carRules.openBuildUpTo', {pi: formatMaxPi(maxPi)})
      : t('carRules.allowedCars', {count: carCount});
  const trimmedDescription = description.trim();
  const displayTitle = title.trim() || 'Untitled event';

  const channelValue = targetChannelId
    ? isPublished
      ? 'Announcement channel (locked)'
      : 'Channel selected'
    : 'Choose before publish';

  return (
    <div className="space-y-4">
      {isEditMode ? (
        <p className="text-xs leading-relaxed text-muted">
          {isPublished
            ? 'Preview your live event. Server and channel stay locked; other fields can be updated below.'
            : 'Preview before you publish. Jump to any step above to change details.'}
        </p>
      ) : null}

      <div className="relative overflow-hidden rounded-xl border border-white/[0.08]">
        <EventCover
          src={coverPreview ?? defaultCoverPath(type)}
          variant="preview"
          className="aspect-[2/1] w-full sm:aspect-video"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 px-4 pb-4 pt-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge type={type} />
            <CarRuleBadge mode={carRuleMode} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">{displayTitle}</h2>
          {when ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-300">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              {when.primary}
            </p>
          ) : null}
        </div>
      </div>

      {trimmedDescription ? (
        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm leading-relaxed text-slate-300">
          {trimmedDescription}
        </p>
      ) : null}

      {missingForPublish.length > 0 && (
        <Alert variant="sky" title={t('create.beforePublish')} className="py-2.5">
          <ul className="space-y-2">
            {missingForPublish.map((gap) => (
              <li key={gap.message} className="flex flex-wrap items-center justify-between gap-2">
                <span>{gap.message}</span>
                {onJumpToStep ? (
                  <TextButton type="button" onClick={() => onJumpToStep(gap.step)}>
                    {t('create.editStep', {step: t(`create.steps.${['basics', 'details', 'target', 'preview'][gap.step]}`)})}
                  </TextButton>
                ) : null}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Panel variant="soft" divided className="overflow-hidden">
        <ReviewSection title={t('create.publishTarget')}>
          <ReviewFact
            icon={MapPin}
            label={t('create.server')}
            value={targetGuildName || t('common.notSet')}
            hint={isPublished ? 'Locked after publish' : undefined}
          />
          <ReviewFact
            icon={Hash}
            label={t('create.channel')}
            value={channelValue}
            hint={
              !targetChannelId && !isPublished
                ? 'Pick on Target or when you tap Publish'
                : isPublished
                  ? 'Locked after publish'
                  : undefined
            }
          />
        </ReviewSection>

        <ReviewSection title={t('create.convoy')}>
          <ReviewFact icon={Users} label={t('create.leader')} value={lobbyLeaderLabel || t('common.dash')} />
        </ReviewSection>

        <ReviewSection title={t('create.routeAndCars')}>
          {normalizedTrackCodes.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('eventDetail.tracks')}</p>
              <ol className="mt-1.5 space-y-1">
                {normalizedTrackCodes.map((code, i) => (
                  <li
                    key={`${code}-${i}`}
                    className="flex items-center gap-2 font-mono text-sm tracking-wide text-slate-200"
                  >
                    <span className="text-[10px] font-bold tabular-nums text-muted">{i + 1}.</span>
                    {code}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <ReviewFact label={t('eventDetail.tracks')} value={t('common.dash')} hint={t('create.tracksOptional')} />
          )}
          <ReviewFact label={t('eventDetail.carRules')} value={carRules} />
        </ReviewSection>
      </Panel>
    </div>
  );
}

export function collectPublishGaps(input: {
  channelId: string;
  carRuleMode: CarRuleMode;
  carCount: number;
}): PublishGap[] {
  const gaps: PublishGap[] = [];
  if (!input.channelId) {
    gaps.push({message: 'Select an announcement channel on Target.', step: 2});
  }
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    gaps.push({message: 'Add at least one car on Details.', step: 1});
  }
  return gaps;
}
