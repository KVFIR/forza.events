import type {LegalDocument} from './types';

/** English privacy policy — authoritative for Discord verification and compliance. */
export const privacyPolicyEn: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: '2026-05-28',
  intro:
    'This Privacy Policy describes how FORZA.EVENTS ("we", "us", "our") collects, uses, stores, and shares information when you use our Discord Application, embedded Activity, and related services (collectively, the "Service"). The Service helps Forza Horizon community members discover, create, join, and run racing events through Discord.',
  sections: [
    {
      id: 'controller',
      title: '1. Who we are',
      blocks: [
        {
          type: 'p',
          text: 'FORZA.EVENTS is a community tool delivered primarily as a Discord Activity (embedded web application) with a Discord bot used to publish event announcements and handle interactions. For privacy questions or requests, contact us at the email listed in Section 12.',
        },
      ],
    },
    {
      id: 'scope',
      title: '2. Scope',
      blocks: [
        {
          type: 'p',
          text: 'This policy applies to the Service when you use it inside Discord (including through the App Launcher, voice, DMs, or links from event embeds) and when you open certain public pages on our website (such as this policy and our Terms of Service).',
        },
        {
          type: 'p',
          text: 'Discord processes your use of the Discord platform under Discord’s own Privacy Policy. We do not control Discord’s processing of your Discord account, messages, or voice/video outside what our Application accesses through Discord’s APIs as described below.',
        },
      ],
    },
    {
      id: 'collect',
      title: '3. Information we collect',
      blocks: [
        {
          type: 'p',
          text: 'We collect information in the following categories:',
        },
        {
          type: 'ul',
          items: [
            'Discord account data (via OAuth scopes identify and guilds): Discord user ID, username, display name, discriminator (if provided by Discord), avatar URL, and the list of Discord servers (guilds) your account can access — used to sign you in, show your profile, and let hosts pick a publish target where our bot is installed.',
            'Profile and gameplay preferences you provide: Xbox gamertag, region, timezone, language preferences, and preferred event types — stored in our database to run events and show your participation.',
            'Event and participation data: event titles, types, schedules, tracks, cars, restrictions, cover images you upload, server and channel IDs for publishing, join/leave actions, convoy leader assignments, race results, and related metadata created when you host or join events.',
            'Discord server metadata: guild IDs and names, channel IDs, message IDs for published embeds, and launch-intent records when you open the Activity from a button on an embed.',
            'Technical and security data: API request metadata (such as client IP address and timestamps) used for rate limiting and abuse prevention; browser language preference stored locally; optional locale choice stored in your browser’s local storage.',
            'Session data on your device: after sign-in, your Discord OAuth access token and a cached copy of basic profile fields may be stored in session storage until you close the browser tab or sign out, so the Service can call our backend on your behalf.',
          ],
        },
        {
          type: 'p',
          text: 'When hosts search for a convoy leader, we may request a limited list of members in a Discord server through Discord’s API (Server Members privileged intent) to display usernames and avatars for selection. We use this only to support event setup, not for unrelated marketing.',
        },
      ],
    },
    {
      id: 'sources',
      title: '4. Sources of information',
      blocks: [
        {
          type: 'ul',
          items: [
            'Directly from you (profile fields, event forms, uploads, results).',
            'From Discord when you authorize the Application (OAuth) or when our bot or Activity calls Discord APIs (guild/channel permissions, embed posting, member lookup where enabled).',
            'Automatically from your browser or device (local storage, session storage, standard request headers).',
          ],
        },
      ],
    },
    {
      id: 'use',
      title: '5. How we use information',
      blocks: [
        {
          type: 'p',
          text: 'We use information to:',
        },
        {
          type: 'ul',
          items: [
            'Provide, operate, and improve the Service (browse events, create and publish events, join or leave events, submit results, sync Discord embeds).',
            'Authenticate you and enforce permissions (for example, only the event host can edit or cancel their event).',
            'Validate publish targets (confirm you can manage the server and the bot can post in the chosen channel).',
            'Display public event and participant information to other users of the Service.',
            'Maintain security, prevent abuse, and enforce rate limits.',
            'Comply with law and respond to lawful requests.',
          ],
        },
        {
          type: 'p',
          text: 'We do not sell your personal information. We do not use your data for third-party advertising or profiling for ads.',
        },
      ],
    },
    {
      id: 'legal-bases',
      title: '6. Legal bases (EEA/UK users)',
      blocks: [
        {
          type: 'p',
          text: 'Where the GDPR or UK GDPR applies, we rely on: (a) performance of a contract — to provide the Service you request; (b) legitimate interests — to secure and improve the Service, prevent fraud, and show community event listings (balanced against your rights); and (c) consent — where required, for example when you choose optional profile fields or authorize Discord OAuth. You may withdraw consent by disconnecting the Application or contacting us, without affecting lawfulness of processing before withdrawal.',
        },
      ],
    },
    {
      id: 'share',
      title: '7. How we share information',
      blocks: [
        {
          type: 'p',
          text: 'We share information only as needed to run the Service:',
        },
        {
          type: 'ul',
          items: [
            'Discord, Inc. — OAuth, bot APIs, Activity hosting, embeds, and interactions. Data you share with Discord is also subject to Discord’s Privacy Policy and Developer Terms.',
            'Supabase (database, storage, serverless functions) — hosting and processing data we store (events, users, participation, images). Supabase acts as our infrastructure provider.',
            'Railway or similar hosting — serving the web Application frontend.',
            'Other users — published events, participant gamertags, host usernames, and results visible according to event status and Service rules.',
          ],
        },
        {
          type: 'p',
          text: 'We may disclose information if required by law, to protect rights and safety, or in connection with a merger or asset sale, with notice where legally permitted.',
        },
      ],
    },
    {
      id: 'retention',
      title: '8. Retention',
      blocks: [
        {
          type: 'p',
          text: 'We keep information for as long as needed to provide the Service and for legitimate business purposes (for example, maintaining event history and participation records). Rate-limit and security logs are kept for a limited period. You may request deletion of your account data as described in Section 10. Some information may remain in backups for a short period or where we must retain it for legal obligations.',
        },
      ],
    },
    {
      id: 'security',
      title: '9. Security',
      blocks: [
        {
          type: 'p',
          text: 'We use technical and organizational measures appropriate to the risk, including encrypted connections (HTTPS), access controls on our database, server-side validation of mutations, and rate limiting. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.',
        },
      ],
    },
    {
      id: 'rights',
      title: '10. Your rights and choices',
      blocks: [
        {
          type: 'p',
          text: 'Depending on your location, you may have the right to access, correct, delete, restrict, or object to certain processing of your personal information, and to data portability or to lodge a complaint with a supervisory authority.',
        },
        {
          type: 'ul',
          items: [
            'Update profile fields (such as gamertag) in the Service where available.',
            'Leave events and stop participating; some host-created records may remain tied to completed events.',
            'Revoke the Application’s access in Discord under User Settings → Authorized Apps.',
            'Clear session data by closing the browser session or signing out where the Service provides sign-out.',
            'Request access or deletion by emailing us (Section 12). We may need to verify your Discord identity before fulfilling requests.',
          ],
        },
        {
          type: 'p',
          text: 'California residents may have additional rights under the CCPA/CPRA, including knowing categories collected, requesting deletion, and non-discrimination for exercising rights. We do not sell personal information as defined by the CCPA.',
        },
      ],
    },
    {
      id: 'children',
      title: '11. Children',
      blocks: [
        {
          type: 'p',
          text: 'The Service is intended for users who meet Discord’s minimum age requirements (typically at least 13 years old, or higher where local law requires). We do not knowingly collect personal information from children below the applicable minimum age. If you believe we have collected such information, contact us and we will take appropriate steps to delete it.',
        },
      ],
    },
    {
      id: 'contact',
      title: '12. Contact',
      blocks: [
        {
          type: 'p',
          text: 'For privacy questions, access requests, or deletion requests, email {{CONTACT_EMAIL}}. Please include your Discord username and the nature of your request. We aim to respond within a reasonable time, generally within 30 days where the GDPR applies.',
        },
      ],
    },
    {
      id: 'international',
      title: '13. International transfers',
      blocks: [
        {
          type: 'p',
          text: 'Our service providers may process data in the United States or other countries. Where required, we rely on appropriate safeguards (such as standard contractual clauses offered by providers) for transfers from the EEA/UK.',
        },
      ],
    },
    {
      id: 'changes',
      title: '14. Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this Privacy Policy from time to time. We will post the revised policy at this URL and update the "Last updated" date. Material changes may be communicated through the Service or Discord where appropriate. Continued use after changes take effect constitutes acceptance of the updated policy.',
        },
      ],
    },
    {
      id: 'discord',
      title: '15. Discord API data',
      blocks: [
        {
          type: 'p',
          text: 'Our use of information received from Discord APIs follows the Discord Developer Terms of Service and Discord Developer Policy. We use Discord API data only as described in this policy and to provide the Service. If you remove our Application from your Discord account, we will no longer receive new OAuth tokens from you, but we may retain historical records as described above until you request deletion.',
        },
      ],
    },
  ],
};
