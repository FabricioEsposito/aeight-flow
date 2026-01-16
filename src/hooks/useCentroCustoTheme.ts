import { useMemo } from 'react';

interface CompanyThemeInfo {
  codigo: string;
  name: string;
  primaryColor: string;
  lightColor: string;
  gradient: string;
  className: string;
}

const companyThemes: Record<string, CompanyThemeInfo> = {
  '001_b8one': {
    codigo: '001_b8one',
    name: 'b8one',
    primaryColor: 'hsl(217, 91%, 50%)',
    lightColor: 'hsl(217, 91%, 96%)',
    gradient: 'linear-gradient(135deg, hsl(217, 91%, 50%), hsl(217, 91%, 40%))',
    className: 'theme-b8one',
  },
  '002_lomadee': {
    codigo: '002_lomadee',
    name: 'Lomadee',
    primaryColor: 'hsl(328, 100%, 45%)',
    lightColor: 'hsl(328, 100%, 96%)',
    gradient: 'linear-gradient(135deg, hsl(328, 100%, 45%), hsl(328, 100%, 35%))',
    className: 'theme-lomadee',
  },
  '003_cryah': {
    codigo: '003_cryah',
    name: 'Cryah',
    primaryColor: 'hsl(340, 82%, 52%)',
    lightColor: 'hsl(340, 82%, 96%)',
    gradient: 'linear-gradient(135deg, hsl(340, 82%, 52%), hsl(340, 82%, 42%))',
    className: 'theme-cryah',
  },
  '004_saio': {
    codigo: '004_saio',
    name: 'SAIO',
    primaryColor: 'hsl(217, 91%, 50%)',
    lightColor: 'hsl(217, 91%, 96%)',
    gradient: 'linear-gradient(135deg, hsl(217, 91%, 50%), hsl(221, 83%, 53%))',
    className: 'theme-saio',
  },
};

const defaultTheme: CompanyThemeInfo = {
  codigo: 'aeight',
  name: 'A&EIGHT',
  primaryColor: 'hsl(217, 91%, 50%)',
  lightColor: 'hsl(217, 91%, 96%)',
  gradient: 'linear-gradient(135deg, hsl(217, 91%, 50%), hsl(217, 91%, 40%))',
  className: '',
};

export function useCentroCustoTheme(centroCustoCodigo?: string | null) {
  const themeInfo = useMemo(() => {
    if (!centroCustoCodigo) return defaultTheme;
    
    // Try exact match first
    if (companyThemes[centroCustoCodigo]) {
      return companyThemes[centroCustoCodigo];
    }
    
    // Try partial match
    const matchedKey = Object.keys(companyThemes).find(key => 
      centroCustoCodigo.toLowerCase().includes(key.split('_')[1].toLowerCase())
    );
    
    return matchedKey ? companyThemes[matchedKey] : defaultTheme;
  }, [centroCustoCodigo]);

  return themeInfo;
}

export function getCompanyTheme(centroCustoCodigo?: string | null): CompanyThemeInfo {
  if (!centroCustoCodigo) return defaultTheme;
  
  // Try exact match first
  if (companyThemes[centroCustoCodigo]) {
    return companyThemes[centroCustoCodigo];
  }
  
  // Try partial match (case insensitive)
  const lowerCodigo = centroCustoCodigo.toLowerCase();
  const matchedKey = Object.keys(companyThemes).find(key => 
    lowerCodigo.includes(key.split('_')[1].toLowerCase()) ||
    key.toLowerCase().includes(lowerCodigo)
  );
  
  return matchedKey ? companyThemes[matchedKey] : defaultTheme;
}

export function getAllCompanyThemes(): CompanyThemeInfo[] {
  return Object.values(companyThemes);
}

export { companyThemes, defaultTheme };
export type { CompanyThemeInfo };
