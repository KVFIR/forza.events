import type {ReactNode} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {cn} from '../../lib/cn';
import {Logo} from '../ui/Logo';
import {getServiceOrigin} from '../../lib/legalContact';

type Props = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

function legalNavLinkClass(active: boolean): string {
  return cn(
    'hover:text-white',
    active ? 'font-medium text-white' : 'text-muted',
  );
}

export function LegalPageLayout({title, lastUpdated, children}: Props) {
  const {t} = useTranslation();
  const {pathname} = useLocation();
  const origin = getServiceOrigin();
  const onTerms = pathname === '/terms';
  const onPrivacy = pathname === '/privacy';

  return (
    <div className="min-h-screen bg-base text-white">
      <header className="border-b border-white/10 px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex w-fit" aria-label={t('legal.homeAria')}>
            <Logo />
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm" aria-label={t('legal.navAria')}>
            <Link
              to="/terms"
              className={legalNavLinkClass(onTerms)}
              aria-current={onTerms ? 'page' : undefined}
            >
              {t('legal.termsLink')}
            </Link>
            <Link
              to="/privacy"
              className={legalNavLinkClass(onPrivacy)}
              aria-current={onPrivacy ? 'page' : undefined}
            >
              {t('legal.privacyLink')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-xs text-muted">
          {t('legal.lastUpdated', {date: lastUpdated})} · {origin}
        </p>
        <p className="mt-4 text-xs text-muted">{t('legal.englishAuthoritative')}</p>
        <div className="mt-8">{children}</div>
      </main>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-muted sm:px-8">
        <p>{t('legal.footer')}</p>
      </footer>
    </div>
  );
}
