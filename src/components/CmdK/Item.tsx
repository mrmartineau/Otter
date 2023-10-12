import { Bookmark } from '@/src/types/db';
import clsx from 'clsx';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { ComponentProps, ReactNode, forwardRef, useContext } from 'react';

import { Flex } from '../Flex';
import { CmdKContext } from './CmdK';

export interface AccessoryModel {
  Icon?: ReactNode;
  text?: string;
  tooltip?: string;
  showOnMobile?: boolean;
}

export type ItemProps = ComponentProps<typeof Command.Item> &
  Partial<Pick<Bookmark, 'url'>> & {
    to?: string;
    children: ReactNode;
    onSelect?: (value: string) => void;
    accessories?: AccessoryModel[];
    image?: ReactNode;
    primaryNav?: string;
    secondaryNav?: string;
    action?: () => void;
  };

export const Item = forwardRef<HTMLDivElement, ItemProps>(
  ({ to, accessories, children, image, action, ...rest }, ref) => {
    const { toggleOpen } = useContext(CmdKContext);
    const router = useRouter();
    const navigate = (to: string): void => {
      if (to.startsWith('/')) {
        router.push(to);
      } else {
        window.location.href = to;
      }
      toggleOpen();
    };

    const Contents = () => (
      <>
        <Flex gap="2xs" align="center" className="leading-snug">
          {image}
          {children}
        </Flex>
        <Flex
          gap="2xs"
          align="center"
          className="text-right text-sm text-theme9"
        >
          {accessories?.length ? (
            <>
              {accessories.map(
                ({ Icon, tooltip, text, showOnMobile }, index) => {
                  return (
                    <Flex
                      align="center"
                      key={`${to}-${index}`}
                      title={tooltip}
                      className={clsx('cmdk-item-accessory', {
                        showOnMobile: showOnMobile,
                        hideOnMobile: !showOnMobile,
                      })}
                    >
                      {Icon || text || null}
                    </Flex>
                  );
                },
              )}
            </>
          ) : null}
        </Flex>
      </>
    );

    return (
      <Command.Item
        className="cmdk-item"
        onSelect={() => {
          if (to) {
            navigate(to);
          }
          if (action) {
            action();
          }
        }}
        {...rest}
        ref={ref}
      >
        <Contents />
      </Command.Item>
    );
  },
);

Item.displayName = 'CmdK.Item';
