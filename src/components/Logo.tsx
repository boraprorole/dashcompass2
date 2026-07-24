import { cn } from "@/lib/utils";
import logoAsset from "@/assets/dashcompass-logo.svg.asset.json";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  isCollapsed?: boolean;
}

export function Logo({ className, iconClassName, textClassName, isCollapsed }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div 
        className={cn(
          "bg-primary shrink-0", 
          isCollapsed ? "h-8 w-8" : "h-7 w-7",
          iconClassName
        )}
        style={{ 
          WebkitMaskImage: `url(${logoAsset.url})`,
          maskImage: `url(${logoAsset.url})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          filter: 'drop-shadow(0 0 8px var(--primary-glow))'
        }}
      />
      {!isCollapsed && (
        <span className={cn(
          "font-sans font-bold tracking-tighter text-white leading-none pt-[1px]", 
          textClassName
        )}>
          DashCompass
        </span>
      )}
    </div>
  );
}
