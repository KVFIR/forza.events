import type {ButtonHTMLAttributes, HTMLAttributes, LiHTMLAttributes, ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {dropdownItemClass, dropdownListClass} from './formStyles';

type ListProps = HTMLAttributes<HTMLUListElement>;

export function DropdownList({className, children, ...props}: ListProps) {
  return (
    <ul className={cn(dropdownListClass, className)} {...props}>
      {children}
    </ul>
  );
}

type ItemProps = LiHTMLAttributes<HTMLLIElement> & {
  children: ReactNode;
  buttonClassName?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function DropdownItem({
  className,
  buttonClassName,
  children,
  type = 'button',
  ...buttonProps
}: ItemProps) {
  return (
    <li className={className}>
      <button type={type} className={cn(dropdownItemClass, buttonClassName)} {...buttonProps}>
        {children}
      </button>
    </li>
  );
}
