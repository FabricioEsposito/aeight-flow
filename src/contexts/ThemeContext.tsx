import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';
type CompanyTheme = 'aeight' | 'b8one' | 'lomadee' | 'cryah' | 'saio';

interface ThemeContextType {
  theme: Theme;
  companyTheme: CompanyTheme;
  setTheme: (theme: Theme) => void;
  setCompanyTheme: (company: CompanyTheme) => void;
  toggleTheme: () => void;
  getCompanyColor: (company?: string) => string;
  getCompanyName: (codigo: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Company color mapping (HSL values)
const companyColors: Record<string, { primary: string; name: string }> = {
  '001_b8one': { primary: 'hsl(217, 91%, 50%)', name: 'b8one' },
  '002_lomadee': { primary: 'hsl(328, 100%, 45%)', name: 'Lomadee' },
  '003_cryah': { primary: 'hsl(340, 82%, 52%)', name: 'Cryah' },
  '004_saio': { primary: 'hsl(217, 91%, 50%)', name: 'SAIO' },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aeight-theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
      // Default to light mode for corporate use
      return 'light';
    }
    return 'light';
  });

  const [companyTheme, setCompanyThemeState] = useState<CompanyTheme>('aeight');

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('aeight-theme', theme);
  }, [theme]);

  // Apply company theme class
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all company theme classes
    root.classList.remove('theme-b8one', 'theme-lomadee', 'theme-cryah', 'theme-saio');
    
    if (companyTheme !== 'aeight') {
      root.classList.add(`theme-${companyTheme}`);
    }
  }, [companyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const setCompanyTheme = useCallback((company: CompanyTheme) => {
    setCompanyThemeState(company);
  }, []);

  const getCompanyColor = useCallback((company?: string): string => {
    if (!company) return 'hsl(217, 91%, 50%)'; // Default A&EIGHT blue
    
    // Try to match by codigo pattern
    const matchedCompany = Object.entries(companyColors).find(([key]) => 
      company.toLowerCase().includes(key.split('_')[1].toLowerCase()) ||
      key.toLowerCase().includes(company.toLowerCase())
    );
    
    return matchedCompany ? matchedCompany[1].primary : 'hsl(217, 91%, 50%)';
  }, []);

  const getCompanyName = useCallback((codigo: string): string => {
    const company = Object.entries(companyColors).find(([key]) => 
      codigo.toLowerCase().includes(key.split('_')[1].toLowerCase())
    );
    return company ? company[1].name : 'A&EIGHT';
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      companyTheme,
      setTheme,
      setCompanyTheme,
      toggleTheme,
      getCompanyColor,
      getCompanyName,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
