import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "primary" | "success" | "warning" | "destructive";

interface CompanyThemeColors {
  primaryColor: string;
  lightColor: string;
}

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  className?: string;
  subtitle?: string;
  variant?: CardVariant;
  companyTheme?: CompanyThemeColors | null;
}

const variantStyles: Record<CardVariant, {
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverShadow: string;
  accentGradient: string;
}> = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    borderColor: "border-l-muted-foreground/30",
    hoverShadow: "hover:shadow-lg",
    accentGradient: "",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-l-primary",
    hoverShadow: "hover:shadow-primary",
    accentGradient: "from-primary/5 to-transparent",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    borderColor: "border-l-success",
    hoverShadow: "hover:shadow-success",
    accentGradient: "from-success/5 to-transparent",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    borderColor: "border-l-warning",
    hoverShadow: "hover:shadow-warning",
    accentGradient: "from-warning/5 to-transparent",
  },
  destructive: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    borderColor: "border-l-destructive",
    hoverShadow: "hover:shadow-destructive",
    accentGradient: "from-destructive/5 to-transparent",
  },
};

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  className, 
  subtitle,
  variant = "default",
  companyTheme
}: StatsCardProps) {
  const styles = variantStyles[variant];
  
  // Se temos um tema de empresa, usamos as cores dele
  const hasCompanyTheme = companyTheme && companyTheme.primaryColor;
  
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 border-l-4",
        !hasCompanyTheme && styles.borderColor,
        styles.hoverShadow,
        className
      )}
      style={hasCompanyTheme ? {
        borderLeftColor: companyTheme.primaryColor
      } : undefined}
    >
      {/* Subtle gradient accent */}
      {hasCompanyTheme ? (
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            background: `linear-gradient(to bottom right, ${companyTheme.primaryColor}, transparent)` 
          }} 
        />
      ) : variant !== "default" ? (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          styles.accentGradient
        )} />
      ) : null}
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div 
          className={cn(
            "p-2 rounded-lg transition-transform duration-300 hover:scale-110",
            !hasCompanyTheme && styles.iconBg
          )}
          style={hasCompanyTheme ? {
            backgroundColor: `${companyTheme.primaryColor}15`
          } : undefined}
        >
          <Icon 
            className={cn("h-4 w-4", !hasCompanyTheme && styles.iconColor)} 
            style={hasCompanyTheme ? { color: companyTheme.primaryColor } : undefined}
          />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        {subtitle && (
          <p className="text-xs mt-1 text-muted-foreground">
            {subtitle}
          </p>
        )}
        {change && (
          <p className={cn(
            "text-xs mt-1 font-medium",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive", 
            changeType === "neutral" && "text-muted-foreground"
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
