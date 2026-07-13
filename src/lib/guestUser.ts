import type {AppUser} from './types';

/** Placeholder until Discord auth completes (no mock stats or fake events). */
export const GUEST_USER: AppUser = {
  discordId: '',
  username: 'Guest',
  eventsJoined: 0,
  eventsHosted: 0,
  attendanceRate: 0,
  noShows: 0,
  hostRatingAvg: 0,
  dmNotificationsEnabled: true,
  notificationLocale: 'en',
};
