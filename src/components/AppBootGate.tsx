import type {ReactNode} from 'react';

type Props = {
  children: ReactNode;
};

/** Pass-through wrapper; Discord auth no longer blocks route rendering (see AuthStatusIndicator). */
export function AppBootGate({children}: Props) {
  return <>{children}</>;
}
