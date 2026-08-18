export type NotificationLocale = 'en' | 'ru';

export type NotificationKind =
  | 'event_cancelled'
  | 'convoy_leader_changed'
  | 'convoy_leader_assigned'
  | 'waitlist_seat_opened'
  | 'waitlist_new_group'
  | 'waitlist_new_group_leader'
  | 'event_updated'
  | 'event_starting_soon'
  | 'host_group_filled'
  | 'host_event_starting_soon'
  | 'group_reassigned'
  | 'event_now_ranked'
  | 'event_published';

/** Transactional waitlist DMs — sent even when dm_notifications_enabled is false. */
export const WAITLIST_NOTIFICATION_KINDS = new Set<NotificationKind>([
  'waitlist_seat_opened',
  'waitlist_new_group',
  'waitlist_new_group_leader',
  'convoy_leader_assigned',
  'group_reassigned',
]);

type CopyParams = Record<string, string | number | undefined | null>;

function pickLocale(locale: string | null | undefined): NotificationLocale {
  return locale === 'ru' ? 'ru' : 'en';
}

function str(v: CopyParams[string]): string {
  return v == null ? '' : String(v).trim();
}

function voiceJoinLabel(
  lng: NotificationLocale,
  name: CopyParams[string],
): string {
  const cleaned = str(name).replace(/[\[\]()]/g, '').replace(/^#+/, '');
  if (cleaned) return `#${cleaned}`;
  return lng === 'ru' ? 'Зайти в голосовой' : 'Join voice';
}

function voiceJoinFields(
  lng: NotificationLocale,
  url: CopyParams[string],
  name?: CopyParams[string],
): {name: string; value: string}[] {
  const v = str(url);
  if (!v) return [];
  const label = voiceJoinLabel(lng, name);
  return lng === 'ru'
    ? [{name: 'Голос', value: `[${label}](${v})`}]
    : [{name: 'Voice', value: `[${label}](${v})`}];
}

export function openInAppButtonLabel(locale: string | null | undefined): string {
  return pickLocale(locale) === 'ru' ? 'Открыть в FORZA.EVENTS' : 'Open in FORZA.EVENTS';
}

export function openInBrowserButtonLabel(locale: string | null | undefined): string {
  return pickLocale(locale) === 'ru' ? 'Открыть в браузере' : 'Open in browser';
}

const EVENT_TYPE_NOTIFY_LABEL: Record<NotificationLocale, Record<string, string>> = {
  en: {road: 'Road racing', dirt: 'Dirt racing', cruise: 'Meet & cruise'},
  ru: {road: 'Шоссе', dirt: 'Грунт', cruise: 'Встреча и круиз'},
};

export function notifyEventTypeLabel(
  type: string | null | undefined,
  locale: string | null | undefined,
): string {
  const lng = pickLocale(locale);
  const key = (type ?? '').trim();
  return EVENT_TYPE_NOTIFY_LABEL[lng][key] ?? '';
}

type CopyBuilder = (p: CopyParams) => {title: string; description: string; fields?: {name: string; value: string}[]};

const COPY: Record<NotificationKind, Record<NotificationLocale, CopyBuilder>> = {
  event_cancelled: {
    en: (p) => ({
      title: 'Event cancelled',
      description: `**${str(p.eventTitle)}** was cancelled by the host. Registration is closed.`,
    }),
    ru: (p) => ({
      title: 'Ивент отменён',
      description: `**${str(p.eventTitle)}** отменён организатором. Регистрация закрыта.`,
    }),
  },
  convoy_leader_changed: {
    en: (p) => ({
      title: 'Convoy leader updated',
      description: `Convoy **${str(p.groupIndex)}** in **${str(p.eventTitle)}** has a new convoy leader.`,
      fields: [
        {
          name: 'Convoy leader',
          value: `${str(p.leaderGamertag)}${str(p.leaderHandle) ? ` (@${str(p.leaderHandle)})` : ''}`,
        },
      ],
    }),
    ru: (p) => ({
      title: 'Лидер конвоя изменён',
      description: `В конвое **${str(p.groupIndex)}** ивента **${str(p.eventTitle)}** новый лидер конвоя.`,
      fields: [
        {
          name: 'Лидер конвоя',
          value: `${str(p.leaderGamertag)}${str(p.leaderHandle) ? ` (@${str(p.leaderHandle)})` : ''}`,
        },
      ],
    }),
  },
  convoy_leader_assigned: {
    en: (p) => ({
      title: "You're the convoy leader",
      description: `The host assigned you as **convoy leader** for **Convoy ${str(p.groupIndex)}** in **${str(p.eventTitle)}**.`,
    }),
    ru: (p) => ({
      title: 'Вы лидер конвоя',
      description: `Организатор назначил вас **лидером конвоя ${str(p.groupIndex)}** в **${str(p.eventTitle)}**.`,
    }),
  },
  waitlist_seat_opened: {
    en: (p) => ({
      title: "You're in!",
      description: `A seat opened in **${str(p.eventTitle)}**. You're registered in **Convoy ${str(p.groupIndex)}**.`,
      fields: [{name: 'Convoy leader', value: str(p.leaderGamertag)}],
    }),
    ru: (p) => ({
      title: 'Вы в игре!',
      description: `Освободилось место в **${str(p.eventTitle)}**. Вы записаны в **конвой ${str(p.groupIndex)}**.`,
      fields: [{name: 'Лидер конвоя', value: str(p.leaderGamertag)}],
    }),
  },
  waitlist_new_group: {
    en: (p) => ({
      title: 'New convoy added',
      description: `The host opened **Convoy ${str(p.groupIndex)}** in **${str(p.eventTitle)}**. You're registered.`,
      fields: [{name: 'Convoy leader', value: str(p.leaderGamertag)}],
    }),
    ru: (p) => ({
      title: 'Добавлен конвой',
      description: `Организатор открыл **конвой ${str(p.groupIndex)}** в **${str(p.eventTitle)}**. Вы записаны.`,
      fields: [{name: 'Лидер конвоя', value: str(p.leaderGamertag)}],
    }),
  },
  waitlist_new_group_leader: {
    en: (p) => ({
      title: "You're in — and leading!",
      description: `The host opened **Convoy ${str(p.groupIndex)}** in **${str(p.eventTitle)}**. You're the **convoy leader** for this convoy.`,
    }),
    ru: (p) => ({
      title: 'Вы в игре — вы лидер!',
      description: `Организатор открыл **конвой ${str(p.groupIndex)}** в **${str(p.eventTitle)}**. Вы **лидер** этого конвоя.`,
    }),
  },
  event_updated: {
    en: (p) => ({
      title: 'Event updated',
      description: `The host updated **${str(p.eventTitle)}**. Check the latest details before the race.`,
      fields: [
        ...(str(p.scheduleSummary)
          ? [{name: 'Date & time', value: `${str(p.scheduleSummary)} (${str(p.timezone) || 'UTC'})`}]
          : []),
        ...(str(p.tracksSummary) ? [{name: 'Tracks', value: str(p.tracksSummary)}] : []),
        ...(str(p.carsSummary) ? [{name: 'Car rules', value: str(p.carsSummary)}] : []),
      ],
    }),
    ru: (p) => ({
      title: 'Ивент обновлён',
      description: `Организатор обновил **${str(p.eventTitle)}**. Проверьте актуальные детали перед заездом.`,
      fields: [
        ...(str(p.scheduleSummary)
          ? [{name: 'Дата и время', value: `${str(p.scheduleSummary)} (${str(p.timezone) || 'UTC'})`}]
          : []),
        ...(str(p.tracksSummary) ? [{name: 'Трассы', value: str(p.tracksSummary)}] : []),
        ...(str(p.carsSummary) ? [{name: 'Правила по машинам', value: str(p.carsSummary)}] : []),
      ],
    }),
  },
  event_starting_soon: {
    en: (p) => ({
      title: 'Starting in 2 hours',
      description: `**${str(p.eventTitle)}** starts at **${str(p.startsAtLocal)}** (${str(p.timezone)}).`,
      fields: [
        {
          name: 'Your convoy',
          value: `Convoy ${str(p.groupIndex)} · leader ${str(p.leaderGamertag)}`,
        },
        ...voiceJoinFields('en', p.voiceJoinUrl, p.voiceChannelName),
      ],
    }),
    ru: (p) => ({
      title: 'Старт через 2 часа',
      description: `**${str(p.eventTitle)}** начинается в **${str(p.startsAtLocal)}** (${str(p.timezone)}).`,
      fields: [
        {
          name: 'Ваш конвой',
          value: `Конвой ${str(p.groupIndex)} · лидер ${str(p.leaderGamertag)}`,
        },
        ...voiceJoinFields('ru', p.voiceJoinUrl, p.voiceChannelName),
      ],
    }),
  },
  host_group_filled: {
    en: (p) => ({
      title: 'Convoy full',
      description: `**Convoy ${str(p.groupIndex)}** in **${str(p.eventTitle)}** is full (${str(p.maxPlayers)}/${str(p.maxPlayers)}).`,
    }),
    ru: (p) => ({
      title: 'Конвой заполнен',
      description: `**Конвой ${str(p.groupIndex)}** в **${str(p.eventTitle)}** заполнен (${str(p.maxPlayers)}/${str(p.maxPlayers)}).`,
    }),
  },
  host_event_starting_soon: {
    en: (p) => ({
      title: 'Your event starts in 2 hours',
      description: `**${str(p.eventTitle)}** starts at **${str(p.startsAtLocal)}**. Make sure convoy leaders and racers are ready on Xbox.`,
      fields: [
        {
          name: 'Registration',
          value: `${str(p.activeCount)}/${str(p.totalCapacity)} racers · ${str(p.waitlistCount)} on waitlist`,
        },
        ...voiceJoinFields('en', p.voiceJoinUrl, p.voiceChannelName),
      ],
    }),
    ru: (p) => ({
      title: 'Ваш ивент через 2 часа',
      description: `**${str(p.eventTitle)}** начинается в **${str(p.startsAtLocal)}**. Убедитесь, что лидеры конвоев и гонщики готовы в Xbox.`,
      fields: [
        {
          name: 'Регистрация',
          value: `${str(p.activeCount)}/${str(p.totalCapacity)} гонщиков · ${str(p.waitlistCount)} в очереди`,
        },
        ...voiceJoinFields('ru', p.voiceJoinUrl, p.voiceChannelName),
      ],
    }),
  },
  group_reassigned: {
    en: (p) => ({
      title: 'Convoy updated',
      description: `The host moved you to **Convoy ${str(p.groupIndex)}** in **${str(p.eventTitle)}**.`,
      fields: [{name: 'Convoy leader', value: str(p.leaderGamertag)}],
    }),
    ru: (p) => ({
      title: 'Конвой изменён',
      description: `Организатор перенёс вас в **конвой ${str(p.groupIndex)}** в **${str(p.eventTitle)}**.`,
      fields: [{name: 'Лидер конвоя', value: str(p.leaderGamertag)}],
    }),
  },
  event_published: {
    en: (p) => ({
      title: 'New event',
      description: `**${str(p.eventTitle)}** is now on Browse.`,
      fields: [
        ...(str(p.startsAtLocal)
          ? [{name: 'When', value: `${str(p.startsAtLocal)} (${str(p.timezone) || 'UTC'})`}]
          : []),
        ...(str(p.typeLabel) || str(p.gameLabel)
          ? [{name: 'Type', value: [str(p.gameLabel), str(p.typeLabel)].filter(Boolean).join(' · ')}]
          : []),
      ],
    }),
    ru: (p) => ({
      title: 'Новый ивент',
      description: `**${str(p.eventTitle)}** появился в Обзоре.`,
      fields: [
        ...(str(p.startsAtLocal)
          ? [{name: 'Когда', value: `${str(p.startsAtLocal)} (${str(p.timezone) || 'UTC'})`}]
          : []),
        ...(str(p.typeLabel) || str(p.gameLabel)
          ? [{name: 'Тип', value: [str(p.gameLabel), str(p.typeLabel)].filter(Boolean).join(' · ')}]
          : []),
      ],
    }),
  },
  /** One-off / admin: published event flipped to ranked (not exposed in host UI). */
  event_now_ranked: {
    en: (p) => ({
      title: 'Now a ranked race',
      description:
        `**${str(p.eventTitle)}** is now a **ranked** race. Finishing positions update your global driver rating (DNF counts as last; DNS does not count).`,
    }),
    ru: (p) => ({
      title: 'Ивент стал рейтинговым',
      description:
        `**${str(p.eventTitle)}** теперь **рейтинговый**. Места на финише обновляют ваш глобальный рейтинг (DNF = последнее место; DNS не учитывается).`,
    }),
  },
};

export function buildNotificationEmbed(
  kind: NotificationKind,
  locale: string | null | undefined,
  params: CopyParams,
): {title: string; description: string; fields?: {name: string; value: string}[]} {
  const lng = pickLocale(locale);
  return COPY[kind][lng](params);
}

/** Runtime guard for outbox rows whose kind was removed from COPY. */
export function isKnownNotificationKind(kind: string): kind is NotificationKind {
  return Object.prototype.hasOwnProperty.call(COPY, kind);
}
