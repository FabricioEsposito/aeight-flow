import { cn } from "@/lib/utils";
import { getCompanyTheme } from "@/hooks/useCentroCustoTheme";

interface CompanyBadgeProps {
  codigo: string;
  className?: string;
  showName?: boolean;
}

export function CompanyBadge({ codigo, className, showName = true }: CompanyBadgeProps) {
  const theme = getCompanyTheme(codigo);
  
  // Extract company code for display (e.g., "001" from "001_b8one")
  const displayCode = codigo.split('_')[0] || codigo;
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
        className
      )}
      style={{
        backgroundColor: `${theme.primaryColor}15`,
        color: theme.primaryColor,
        borderLeft: `3px solid ${theme.primaryColor}`,
      }}
    >
      <span 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: theme.primaryColor }}
      />
      <span className="font-mono text-xs opacity-75">{displayCode}</span>
      {showName && (
        <span className="font-semibold">{theme.name}</span>
      )}
    </div>
  );
}

interface CompanyDotProps {
  codigo: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CompanyDot({ codigo, className, size = 'md' }: CompanyDotProps) {
  const theme = getCompanyTheme(codigo);
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  
  return (
    <span 
      className={cn(
        "inline-block rounded-full shadow-sm",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: theme.primaryColor }}
      title={theme.name}
    />
  );
}

interface CompanyTagProps {
  codigo: string;
  className?: string;
}

export function CompanyTag({ codigo, className }: CompanyTagProps) {
  const theme = getCompanyTheme(codigo);
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: theme.lightColor,
        color: theme.primaryColor,
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: theme.primaryColor }}
      />
      {theme.name}
    </span>
  );
}

interface CompanyTagWithPercentProps {
  codigo: string;
  percentual: number;
  className?: string;
}

export function CompanyTagWithPercent({ codigo, percentual, className }: CompanyTagWithPercentProps) {
  const theme = getCompanyTheme(codigo);
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
        className
      )}
      style={{
        backgroundColor: theme.lightColor,
        color: theme.primaryColor,
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: theme.primaryColor }}
      />
      <span className="truncate">{theme.name}</span>
      <span className="opacity-70 shrink-0">{percentual}%</span>
    </span>
  );
}
