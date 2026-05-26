import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {panelClass, sectionLabelClass} from './formStyles';

type Props = {
  label: string;
  value: ReactNode;
  className?: string;
};

export function StatCard({label, value, className}: Props) {
  return (
    <div
      className={cn(
        panelClass,
        'flex flex-1 flex-col gap-0.5 px-3 py-2.5 text-center',
        className,
      )}
    >
      <span className="text-lg font-black tabular-nums text-white">{value}</span>
      <span className={cn(sectionLabelClass, 'tracking-[0.12em]')}>{label}</span>
    </div>
  );
}
