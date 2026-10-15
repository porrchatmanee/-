import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontSizeOption = 'normal' | 'large' | 'xlarge';
export type FontStyleOption = 'prompt' | 'mitr';

interface ThemeContextType {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  fontStyle: FontStyleOption;
  setFontStyle: (style: FontStyleOption) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  fontSize: 'normal',
  setFontSize: () => {},
  fontStyle: 'prompt',
  setFontStyle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>(() => {
    return (localStorage.getItem('sukjai_font_size') as FontSizeOption) || 'normal';
  });

  const [fontStyle, setFontStyleState] = useState<FontStyleOption>(() => {
    return (localStorage.getItem('sukjai_font_style') as FontStyleOption) || 'prompt';
  });

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size);
    localStorage.setItem('sukjai_font_size', size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const setFontStyle = (style: FontStyleOption) => {
    setFontStyleState(style);
    localStorage.setItem('sukjai_font_style', style);
    if (style === 'mitr') {
      document.body.style.fontFamily = '"Mitr", "Fredoka", "Prompt", sans-serif';
    } else {
      document.body.style.fontFamily = '"Prompt", "Mitr", "Kanit", sans-serif';
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    if (fontStyle === 'mitr') {
      document.body.style.fontFamily = '"Mitr", "Fredoka", "Prompt", sans-serif';
    } else {
      document.body.style.fontFamily = '"Prompt", "Mitr", "Kanit", sans-serif';
    }
  }, [fontSize, fontStyle]);

  return (
    <ThemeContext.Provider value={{ fontSize, setFontSize, fontStyle, setFontStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
