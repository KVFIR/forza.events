/* eslint-disable react/prop-types */
import React from 'react';
import './index.css';

const screenData = [
  {
    title: 'Discover',
    heading: 'FORZA.EVENTS',
    chips: ['Race', 'Tournament', 'Cruise'],
    cards: [
      { title: 'Night Street Cup', meta: 'Today, 20:00 · 24/32', cta: 'Join' },
      { title: 'Sunset Cruise', meta: 'Today, 19:00 · 18/30', cta: 'Join' },
      { title: 'Drift Session', meta: 'Tomorrow, 16:30 · 16/24', cta: 'Join' },
    ],
  },
  {
    title: 'Event Details',
    heading: 'Night Street Cup',
    chips: ['Race', 'A-Class (700)', 'BoostedRacer'],
    cards: [
      { title: 'Rules', meta: 'Clean racing only. Respect all drivers.', cta: 'Read' },
      { title: 'Participants', meta: '24 / 32 racers', cta: 'View' },
      { title: 'Discord voice required', meta: 'You will be asked to join channel.', cta: 'Open' },
    ],
  },
  {
    title: 'Discord Integration',
    heading: 'Connected',
    chips: ['ForzaFan#2567', 'Voice channel ready'],
    cards: [
      { title: '#event-night-street-cup', meta: 'Temporary event voice channel', cta: 'Join' },
      { title: 'Reminders', meta: 'Notify 15 minutes before event starts.', cta: 'On' },
      { title: 'What to expect', meta: 'Check-in and race briefing in voice.', cta: 'Info' },
    ],
  },
  {
    title: 'Create Event',
    heading: 'Publish New Race',
    chips: ['Race', 'Tournament', 'Cruise', 'Meet'],
    cards: [
      { title: 'Date & Time', meta: 'May 24, 2024 · 20:00', cta: 'Edit' },
      { title: 'Max players', meta: '32', cta: '+/-' },
      { title: 'Region', meta: 'Europe (EU)', cta: 'Select' },
    ],
  },
  {
    title: 'Profile',
    heading: 'ForzaFan',
    chips: ['Level 48', '12,340 / 18,000 XP'],
    cards: [
      { title: 'Attendance', meta: '92% last 30 days', cta: 'Stats' },
      { title: 'Events joined', meta: '64 last 30 days', cta: 'Stats' },
      { title: 'Host Reputation', meta: '4.8 ★★★★★', cta: 'Top 12%' },
    ],
  },
];

function PhoneScreen({ screen }) {
  return (
    <article className="phone">
      <header>
        <p className="time">9:41</p>
        <h2>{screen.title}</h2>
      </header>

      <div className="hero">
        <h3>{screen.heading}</h3>
        <div className="chips">
          {screen.chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      </div>

      <div className="stack">
        {screen.cards.map((card) => (
          <section key={card.title} className="card">
            <div>
              <h4>{card.title}</h4>
              <p>{card.meta}</p>
            </div>
            <button type="button">{card.cta}</button>
          </section>
        ))}
      </div>

      <button className="primary" type="button">
        {screen.title === 'Create Event' ? 'Publish Event' : 'Continue'}
      </button>
    </article>
  );
}

export default function App() {
  return (
    <main className="app">
      {screenData.map((screen) => (
        <PhoneScreen key={screen.title} screen={screen} />
      ))}
    </main>
  );
}
