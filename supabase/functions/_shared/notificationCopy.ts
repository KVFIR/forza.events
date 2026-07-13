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
  | 'host_lobby_full'
  | 'host_event_starting_soon';

/** Transactional waitlist DMs — sent even when dm_notifications_enabled is false. */
export const WAITLIST_NOTIFICATION_KINDS = new Set<NotificationKind>([
  'waitlist_seat_opened',
  'waitlist_new_group',
  'waitlist_new_group_leader',
  'convoy_leader_assigned',
]);

type CopyParams = Record<string, string | number | undefined | null>;

function pickLocale(locale: string | null | undefined): NotificationLocale {
  return locale === 'ru' ? 'ru' : 'en';
}

function str(v: CopyParams[string]): string {
  return v == null ? '' : String(v).trim();
}

const OPEN_EVENT: Record<NotificationLocale, string> = {
  en: 'Open event',
  ru: 'Открыть ивент',
};

export function openEventButtonLabel(locale: string | null | undefined): string {
  return OPEN_EVENT[pickLocale(locale)];
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
      description: `Group **${str(p.groupIndex)}** in **${str(p.eventTitle)}** has a new convoy leader.`,
      fields: [
        {
          name: 'Convoy leader',
          value: `${str(p.leaderGamertag)}${str(p.leaderHandle) ? ` (@${str(p.leaderHandle)})` : ''}`,
        },
      ],
    }),
    ru: (p) => ({
      title: 'Лидер конвоя изменён',
      description: `В группе **${str(p.groupIndex)}** ивента **${str(p.eventTitle)}** новый лидер конвоя.`,
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
      description: `The host assigned you as **convoy leader** for **Group ${str(p.groupIndex)}** in **${str(p.eventTitle)}**.`,
    }),
    ru: (p) => ({
      title: 'Вы лидер конвоя',
      description: `Организатор назначил вас **лидером конвоя** **группы ${str(p.groupIndex)}** в **${str(p.eventTitle)}**.`,
    }),
  },
  waitlist_seat_opened: {
    en: (p) => ({
      title: "You're in!",
      description: `A seat opened in **${str(p.eventTitle)}**. You're registered in **Group ${str(p.groupIndex)}**.`,
      fields: [{name: 'Convoy leader', value: str(p.leaderGamertag)}],
    }),
    ru: (p) => ({
      title: 'Вы в игре!',
      description: `Освободилось место в **${str(p.eventTitle)}**. Вы записаны в **группу ${str(p.groupIndex)}**.`,
      fields: [{name: 'Лидер конвоя', value: str(p.leaderGamertag)}],
    }),
  },
  waitlist_new_group: {
    en: (p) => ({
      title: 'New group added',
      description: `The host opened **Group ${str(p.groupIndex)}** in **${str(p.eventTitle)}**. You're registered.`,
      fields: [{name: 'Convoy leader', value: str(p.leaderGamertag)}],
    }),
    ru: (p) => ({
      title: 'Добавлена группа',
      description: `Организатор открыл **группу ${str(p.groupIndex)}** в **${str(p.eventTitle)}**. Вы записаны.`,
      fields: [{name: 'Лидер конвоя', value: str(p.leaderGamertag)}],
    }),
  },
  waitlist_new_group_leader: {
    en: (p) => ({
      title: "You're in — and leading!",
      description: `The host opened **Group ${str(p.groupIndex)}** in **${str(p.eventTitle)}**. You're the **convoy leader** for this group.`,
    }),
    ru: (p) => ({
      title: 'Вы в игре — вы лидер!',
      description: `Организатор открыл **группу ${str(p.groupIndex)}** в **${str(p.eventTitle)}**. Вы **лидер конвоя** этой группы.`,
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
          name: 'Your group',
          value: `Group ${str(p.groupIndex)} · leader ${str(p.leaderGamertag)}`,
        },
      ],
    }),
    ru: (p) => ({
      title: 'Старт через 2 часа',
      description: `**${str(p.eventTitle)}** начинается в **${str(p.startsAtLocal)}** (${str(p.timezone)}).`,
      fields: [
        {
          name: 'Ваша группа',
          value: `Группа ${str(p.groupIndex)} · лидер ${str(p.leaderGamertag)}`,
        },
      ],
    }),
  },
  host_group_filled: {
    en: (p) => ({
      title: 'Group full',
      description: `**Group ${str(p.groupIndex)}** in **${str(p.eventTitle)}** is full (${str(p.maxPlayers)}/${str(p.maxPlayers)}).`,
    }),
    ru: (p) => ({
      title: 'Группа заполнена',
      description: `**Группа ${str(p.groupIndex)}** в **${str(p.eventTitle)}** заполнена (${str(p.maxPlayers)}/${str(p.maxPlayers)}).`,
    }),
  },
  host_lobby_full: {
    en: (p) => ({
      title: 'Lobby full',
      description: `All groups in **${str(p.eventTitle)}** are full. New racers join the **waitlist** (${str(p.waitlistCount)} waiting).`,
    }),
    ru: (p) => ({
      title: 'Лобби заполнено',
      description: `Все группы в **${str(p.eventTitle)}** заполнены. Новые гонщики попадают в **очередь** (${str(p.waitlistCount)} в ожидании).`,
    }),
  },
  host_event_starting_soon: {
    en: (p) => ({
      title: 'Your event starts in 2 hours',
      description: `**${str(p.eventTitle)}** starts at **${str(p.startsAtLocal)}**. Make sure convoy leaders and racers are ready on Xbox.`,
      fields: [
        {
          name: 'Lobby',
          value: `${str(p.activeCount)}/${str(p.totalCapacity)} racers · ${str(p.waitlistCount)} on waitlist`,
        },
      ],
    }),
    ru: (p) => ({
      title: 'Ваш ивент через 2 часа',
      description: `**${str(p.eventTitle)}** начинается в **${str(p.startsAtLocal)}**. Убедитесь, что лидеры конвоев и гонщики готовы в Xbox.`,
      fields: [
        {
          name: 'Лобби',
          value: `${str(p.activeCount)}/${str(p.totalCapacity)} гонщиков · ${str(p.waitlistCount)} в очереди`,
        },
      ],
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
