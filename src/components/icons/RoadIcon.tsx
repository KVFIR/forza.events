import {cn} from '../../lib/cn';

type Props = {
  className?: string;
};

/** Road / track path — converging edges with dashed center line. */
export function RoadIcon({className}: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-3.5 w-3.5', className)}
      aria-hidden
    >
      <path d="M9 3 5 21" />
      <path d="M15 3 19 21" />
      <path d="M12 5v16" strokeDasharray="3 3" />
    </svg>
  );
}
