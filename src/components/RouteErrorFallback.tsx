import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {isRouteErrorResponse, useRouteError} from 'react-router-dom';
import {isLocalDevHost} from '../lib/runtime';
import {Button} from './ui/Button';
import {EmptyState} from './ui/EmptyState';
import {Logo} from './ui/Logo';

export function routeErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    const data =
      typeof error.data === 'string'
        ? error.data
        : error.data != null
          ? JSON.stringify(error.data)
          : '';
    return [error.status, error.statusText, data].filter(Boolean).join(' ');
  }
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

export function isChunkLoadError(error: unknown): boolean {
  const haystack = (
    error instanceof Error
      ? `${error.name} ${error.message}`
      : isRouteErrorResponse(error)
        ? String(error.data ?? error.statusText)
        : String(error)
  ).toLowerCase();

  return (
    haystack.includes('failed to fetch dynamically imported module') ||
    haystack.includes('loading chunk') ||
    haystack.includes('importing a module script failed') ||
    haystack.includes('chunkloaderror')
  );
}

/** Router `errorElement` — detailed panel on localhost; minimal reload UX elsewhere. */
export function RouteErrorFallback() {
  const error = useRouteError();
  const {t} = useTranslation();
  const dev = isLocalDevHost();
  const chunk = isChunkLoadError(error);
  const message = routeErrorMessage(error);

  useEffect(() => {
    console.error('[route]', error);
  }, [error]);

  if (!dev) {
    return (
      <EmptyState
        icon="⚠️"
        title={chunk ? t('errors.route.prodChunkTitle') : t('errors.route.prodTitle')}
        description={t('errors.route.prodDesc')}
        action={{
          label: t('common.tryAgain'),
          onClick: () => window.location.reload(),
        }}
        className="min-h-screen py-20"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-lg space-y-4">
        <Logo className="justify-center" />
        <h1 className="text-lg font-semibold text-white">
          {chunk ? t('errors.route.devChunkTitle') : t('errors.route.devTitle')}
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          {chunk ? t('errors.route.devChunkHint') : t('errors.route.devHint')}
        </p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-black/40 p-3 text-left text-xs text-slate-300">
          {message}
        </pre>
        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          {t('common.tryAgain')}
        </Button>
      </div>
    </div>
  );
}
