import type {SaveEventBody} from './eventSpec.ts';

type EventCarJoinRow = {
  max_pi: number;
  tune_share_code: string | null;
  car_restrictions: string[] | null;
  cars:
    | {
      id: string;
      make: string;
      model: string;
      year: number | null;
      pi: number;
    }
    | {
      id: string;
      make: string;
      model: string;
      year: number | null;
      pi: number;
    }[]
    | null;
};

type EventRowForPublish = {
  title: string;
  type: string;
  starts_at: string;
  timezone_hint: string | null;
  description: string | null;
  cover_image_url: string | null;
  lobby_leader_gamertag: string;
  lobby_leader_is_host: boolean | null;
  car_rule_mode: string;
  max_pi: number | null;
  tracks?: unknown;
  additional_car_restrictions?: string | null;
  rules_allowed?: string[] | null;
};

export function buildPublishEventBody(
  event: EventRowForPublish,
  eventCars: EventCarJoinRow[],
  guildId: string,
  channelId: string,
): SaveEventBody {
  return {
    title: event.title,
    type: event.type,
    starts_at: event.starts_at,
    timezone_hint: event.timezone_hint ?? undefined,
    description: event.description ?? undefined,
    cover_image_url: event.cover_image_url,
    lobby_leader_gamertag: event.lobby_leader_gamertag,
    lobby_leader_is_host: event.lobby_leader_is_host ?? undefined,
    guild_id: guildId,
    channel_id: channelId,
    car_rule_mode: event.car_rule_mode as SaveEventBody['car_rule_mode'],
    max_pi: event.max_pi,
    tracks: (event.tracks ?? []) as SaveEventBody['tracks'],
    additional_car_restrictions:
      event.additional_car_restrictions ??
      (Array.isArray(event.rules_allowed)
        ? event.rules_allowed.find((rule: string) => rule.startsWith('additional:'))?.slice(
          'additional:'.length,
        ) ?? null
        : null),
    cars: eventCars.map((ec) => {
      const raw = ec.cars;
      const car = (Array.isArray(raw) ? raw[0] : raw)!;
      return {
        id: car.id,
        make: car.make,
        model: car.model,
        year: car.year,
        pi: car.pi,
        max_pi: ec.max_pi,
        tune_share_code: ec.tune_share_code,
        car_restrictions: ec.car_restrictions ?? [],
      };
    }),
  };
}
