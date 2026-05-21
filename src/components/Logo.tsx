import { cn } from "@/lib/utils";

/**
 * Renders the HenceFlow logo.
 * - `variant="icon"` (default): square crop focused on the magnifying glass icon
 * - `variant="wordmark"`: full-width brand image including the "HenceFlow" text
 */
export const Logo = ({
  className,
  variant = 'icon',
}: {
  className?: string;
  variant?: 'icon' | 'wordmark';
}) => {
  if (variant === 'wordmark') {
    return (
      <img
        src="/logo.png"
        alt="HenceFlow"
        className={cn("shrink-0 object-contain", className)}
        draggable={false}
      />
    );
  }

  // Icon variant: overflow-clip so only the magnifying-glass portion is visible
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl relative bg-black", className)}>
      <img
        src="/logo.png"
        alt="HenceFlow"
        draggable={false}
        style={{
          position: 'absolute',
          // Scale image so its height is ~3.8× the container height.
          // That narrows the visible width to ~26% of original = just the icon.
          height: '380%',
          width: 'auto',
          top: '-140%',   // centre vertically on the icon area
          left: '-4%',    // slight left nudge onto the magnifying glass
        }}
      />
    </div>
  );
};
