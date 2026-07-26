import type {LegalDocument} from './types';

/** English terms of service — authoritative for Discord verification. */
export const termsOfServiceEn: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: '2026-07-14',
  intro:
    'These Terms of Service ("Terms") govern your access to and use of FORZA.EVENTS, including our Discord Application, embedded Activity, bot features, and related websites (collectively, the "Service"). By using the Service, you agree to these Terms. If you do not agree, do not use the Service.',
  sections: [
    {
      id: 'service',
      title: '1. The Service',
      blocks: [
        {
          type: 'p',
          text: 'FORZA.EVENTS is a community tool for organizing and joining Forza Horizon racing events through Discord. The Service is delivered primarily as a Discord Activity inside the Discord client. The same features are also available on our website at forza.events (and on localhost during development) in a standard web browser after Discord sign-in. Public legal pages are available without signing in.',
        },
      ],
    },
    {
      id: 'eligibility',
      title: '2. Eligibility',
      blocks: [
        {
          type: 'p',
          text: 'You must have a Discord account that meets Discord’s age and eligibility requirements and comply with Discord’s Terms of Service and Community Guidelines. You are responsible for ensuring your use of the Service complies with applicable laws in your region.',
        },
      ],
    },
    {
      id: 'discord',
      title: '3. Discord relationship',
      blocks: [
        {
          type: 'p',
          text: 'Discord is not a party to these Terms. The Service uses Discord’s APIs and platform; your use of Discord is governed by Discord’s terms and policies. When you authorize our Application, you grant us permission to access Discord data as described in our Privacy Policy and only for operating the Service.',
        },
      ],
    },
    {
      id: 'account',
      title: '4. Account and authentication',
      blocks: [
        {
          type: 'p',
          text: 'You sign in through Discord OAuth (in the Activity or in a browser on forza.events). You are responsible for activity under your Discord account and for keeping your account secure. You must provide accurate information (for example, your Xbox gamertag when joining events) so hosts and other players can coordinate in-game.',
        },
      ],
    },
    {
      id: 'hosting',
      title: '5. Hosting and publishing events',
      blocks: [
        {
          type: 'ul',
          items: [
            'Event hosts are responsible for the content of their events, including titles, descriptions, schedules, and channel posts.',
            'Publishing requires selecting a Discord server and channel where our bot is installed and has permission to post embeds.',
            'After an event is published, server and channel targets may be locked to prevent disruption to existing announcements.',
            'Hosts must have appropriate permissions in the target Discord server (for example, Manage Server) as enforced by the Service.',
          ],
        },
      ],
    },
    {
      id: 'participation',
      title: '6. Joining events and conduct',
      blocks: [
        {
          type: 'ul',
          items: [
            'You may join events subject to capacity, waitlist rules, event rules, and Service restrictions (for example, valid gamertag format). When an event is full you may enter a waitlist and be promoted automatically when a seat opens.',
            'Hosts may assign convoy leaders and open additional convoys; assigned leaders have product-specific restrictions (for example, they cannot leave until the host selects a replacement).',
            'Leaving an event may be restricted after the event start time.',
            'You agree not to harass others, post unlawful content, attempt to disrupt the Service, abuse APIs, scrape data, or impersonate others.',
            'Convoy leader and host roles have specific rules in the product; misuse may result in removal from events or loss of access.',
          ],
        },
      ],
    },
    {
      id: 'content',
      title: '7. User content and license',
      blocks: [
        {
          type: 'p',
          text: 'You retain ownership of content you submit (event details, images, text). You grant us a non-exclusive, worldwide, royalty-free license to host, display, reproduce, and distribute that content as needed to operate the Service (including posting embeds to Discord channels you select and showing event listings to other users). You represent that you have the rights to submit the content and that it does not violate third-party rights or applicable law.',
        },
      ],
    },
    {
      id: 'bot',
      title: '8. Discord bot',
      blocks: [
        {
          type: 'p',
          text: 'Server administrators may install our bot to enable publishing and related features. By installing the bot, you authorize it to perform actions in your server as permitted by Discord and the permissions you grant (such as sending messages and embeds in selected channels). You can remove the bot at any time through Discord’s integration settings.',
        },
      ],
    },
    {
      id: 'ip',
      title: '9. Our intellectual property',
      blocks: [
        {
          type: 'p',
          text: 'The Service, including its name, branding, software, and design, is owned by us or our licensors and protected by intellectual property laws. These Terms do not grant you any right to use our trademarks except as necessary to use the Service in accordance with these Terms.',
        },
        {
          type: 'p',
          text: 'Forza Horizon, Xbox, and related marks are property of their respective owners. FORZA.EVENTS is a community project and is not affiliated with, endorsed by, or sponsored by Microsoft, Turn 10, or Discord.',
        },
      ],
    },
    {
      id: 'disclaimer',
      title: '10. Disclaimers',
      blocks: [
        {
          type: 'p',
          text: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE OPERATION, THAT EVENTS WILL OCCUR AS SCHEDULED, OR THAT IN-GAME LOBBIES WILL MATCH EVENT LISTINGS.',
        },
      ],
    },
    {
      id: 'liability',
      title: '11. Limitation of liability',
      blocks: [
        {
          type: 'p',
          text: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM (TYPICALLY ZERO FOR THE FREE SERVICE) OR (B) USD $100.',
        },
        {
          type: 'p',
          text: 'Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted by law.',
        },
      ],
    },
    {
      id: 'indemnity',
      title: '12. Indemnification',
      blocks: [
        {
          type: 'p',
          text: 'You agree to indemnify and hold us harmless from claims, damages, and expenses (including reasonable legal fees) arising from your use of the Service, your content, your violation of these Terms, or your violation of others’ rights or applicable law.',
        },
      ],
    },
    {
      id: 'termination',
      title: '13. Suspension and termination',
      blocks: [
        {
          type: 'p',
          text: 'We may suspend or terminate access to the Service at any time for violation of these Terms, risk to the community, legal requirements, or discontinuation of the Service. You may stop using the Service at any time by revoking the Application in Discord. Sections that by nature should survive (including disclaimers, liability limits, and indemnity) will survive termination.',
        },
      ],
    },
    {
      id: 'changes',
      title: '14. Changes',
      blocks: [
        {
          type: 'p',
          text: 'We may modify these Terms from time to time. We will post updated Terms at this URL and update the "Last updated" date. Your continued use after changes become effective constitutes acceptance. If you do not agree to the new Terms, you must stop using the Service.',
        },
      ],
    },
    {
      id: 'governing',
      title: '15. Governing law',
      blocks: [
        {
          type: 'p',
          text: 'These Terms are governed by the laws of the Republic of Latvia, without regard to conflict-of-law rules, except where mandatory consumer protection laws in your country require otherwise. {{OPERATOR_DESCRIPTION}}',
        },
      ],
    },
    {
      id: 'contact',
      title: '16. Contact',
      blocks: [
        {
          type: 'p',
          text: 'Questions about these Terms: {{CONTACT_EMAIL}}.',
        },
      ],
    },
    {
      id: 'privacy',
      title: '17. Privacy',
      blocks: [
        {
          type: 'p',
          text: 'Our Privacy Policy explains how we collect and use personal information. It is incorporated into these Terms by reference. In case of conflict between these Terms and the Privacy Policy regarding data practices, the Privacy Policy controls for data matters.',
        },
      ],
    },
  ],
};
