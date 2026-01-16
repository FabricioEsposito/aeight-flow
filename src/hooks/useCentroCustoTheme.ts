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
    primaryColor: '#1A1A1A',
    lightColor: '#F5F5F5',
    gradient: 'linear-gradient(135deg, #1A1A1A, #4A5568)',
    className: 'theme-b8one',
  },
  '002_lomadee': {
    codigo: '002_lomadee',
    name: 'Lomadee',
    primaryColor: '#FF5722',
    lightColor: '#FFF3E0',
    gradient: 'linear-gradient(135deg, #FF5722, #E64A19)',
    className: 'theme-lomadee',
  },
  '003_cryah': {
    codigo: '003_cryah',
    name: 'Cryah',
    primaryColor: '#5B2D8B',
    lightColor: '#EDE7F6',
    gradient: 'linear-gradient(135deg, #5B2D8B, #7B1FA2)',
    className: 'theme-cryah',
  },
  '004_saio': {
    codigo: '004_saio',
    name: 'SAIO',
    primaryColor: '#7C6FD0',
    lightColor: '#EDE7F6',
    gradient: 'linear-gradient(135deg, #9B8FE8, #7C6FD0)',
    className: 'theme-saio',
  },
};

const defaultTheme: CompanyThemeInfo = {
  codigo: 'aeight',
  name: 'A&EIGHT',
  primaryColor: '#2563EB',
  lightColor: '#EFF6FF',
  gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
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
