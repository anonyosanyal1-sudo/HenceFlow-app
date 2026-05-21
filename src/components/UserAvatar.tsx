import { cn } from '@/lib/utils';

interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  className?: string;
}

export function UserAvatar({ photoURL, displayName, className = '' }: UserAvatarProps) {
  if (photoURL?.startsWith('emoji:')) {
    const emoji = photoURL.slice(6);
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-primary/15 border border-primary/20 select-none',
          className,
        )}
      >
        {/* 1.5em scales emoji to ~65% of the container regardless of w-* size */}
        <span style={{ fontSize: '1.5em', lineHeight: 1 }}>{emoji}</span>
      </span>
    );
  }

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName || 'User'}
        referrerPolicy="no-referrer"
        className={cn('rounded-full object-cover border border-border', className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary/20 text-primary font-semibold select-none',
        className,
      )}
    >
      {displayName?.[0]?.toUpperCase() || 'U'}
    </span>
  );
}
