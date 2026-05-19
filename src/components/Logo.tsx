import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={cn("shrink-0", className)} 
    fill="none" 
  >
    <rect width="100" height="100" rx="22" className="fill-primary text-primary" />
    <g stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground text-primary-foreground">
      <path d="M 32 25 L 32 65" />
      <circle cx="32" cy="80" r="5" fill="currentColor" stroke="none" />
      <path d="M 68 80 L 68 45" />
      <path d="M 53 35 L 68 50 L 82 20" />
      <path d="M 32 50 C 45 50 55 40 65 35" />
      <path d="M 55 30 L 65 35 L 59 43" />
    </g>
  </svg>
);
