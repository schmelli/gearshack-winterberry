'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { USER_MENU_ITEMS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';
import type { UserMenuItem } from '@/types/navigation';

interface UserMenuProps {
  userName?: string;
  avatarUrl?: string;
  items?: UserMenuItem[];
}

export function UserMenu({
  userName = 'User',
  avatarUrl,
  items = USER_MENU_ITEMS,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item, index) => {
          const isDestructive = item.destructive;
          const showSeparator = isDestructive && index > 0;

          return (
            <div key={item.label}>
              {showSeparator && <DropdownMenuSeparator />}
              {item.href ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'w-full cursor-pointer',
                      isDestructive && 'text-destructive'
                    )}
                  >
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={item.onClick}
                  className={cn(
                    'cursor-pointer',
                    isDestructive && 'text-destructive'
                  )}
                >
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.label}
                </DropdownMenuItem>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
