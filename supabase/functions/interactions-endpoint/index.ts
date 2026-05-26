import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import {OPEN_EVENT_BUTTON_PREFIX} from '../_shared/eventLaunch.ts';
import {adminClient} from '../_shared/supabase.ts';

const INTERACTION_PING = 1;
const INTERACTION_COMPONENT = 3;
const RESPONSE_LAUNCH_ACTIVITY = 12;

function verifySignature(req: Request, body: string): boolean {
  const publicKey = Deno.env.get('DISCORD_PUBLIC_KEY');
  if (!publicKey) return false;

  const signature = req.headers.get('X-Signature-Ed25519');
  const timestamp = req.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return false;

  return nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(publicKey),
  );
}

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {status: 405});
  }

  const body = await req.text();
  const valid = verifySignature(req, body);
  if (!valid) {
    return new Response('Invalid signature', {status: 401});
  }

  const interaction = JSON.parse(body);

  if (interaction.type === INTERACTION_PING) {
    return Response.json({type: 1});
  }

  if (interaction.type === INTERACTION_COMPONENT) {
    const customId = interaction.data?.custom_id as string | undefined;
    if (customId?.startsWith(OPEN_EVENT_BUTTON_PREFIX)) {
      const eventId = customId.slice(OPEN_EVENT_BUTTON_PREFIX.length).trim();
      const discordId = interaction.member?.user?.id ?? interaction.user?.id;
      const guildId = (interaction.guild_id as string | undefined) ?? null;

      if (discordId && eventId) {
        const supabase = adminClient();
        const {error} = await supabase.from('launch_intents').insert({
          discord_id: discordId,
          guild_id: guildId,
          event_id: eventId,
        });
        if (error) {
          console.error(
            JSON.stringify({
              msg: 'launch_intents insert failed',
              eventId,
              discordId,
              guildId,
              detail: error.message,
            }),
          );
        }
        await supabase
          .from('launch_intents')
          .delete()
          .lt('created_at', new Date(Date.now() - 60_000).toISOString());
      }

      return Response.json({type: RESPONSE_LAUNCH_ACTIVITY});
    }
  }

  return Response.json({type: 4, data: {content: 'Unknown interaction'}});
});
