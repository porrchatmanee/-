import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontSizeOption = 'normal' | 'large' | 'xlarge';
export type FontStyleOption = 'mitr' | 'prompt' | 'ibm' | 'kanit';

export interface FontInfo {
  id: FontStyleOption;
  name: string;
  tag: string;
  description: string;
}

export const AVAILABLE_FONTS: FontInfo[] = [
  { id: 'mitr', name: 'มิตร (Mitr)', tag: '🌸 วัยรุ่นน่ารัก', description: 'ฟอนต์มนละมุน อารมณ์ดี อ่านง่าย สบายตา' },
  { id: 'prompt', name: 'พร้อมท์ (Prompt)', tag: '⚡ โมเดิร์นคมชัด', description: 'ฟอนต์มาตรฐานสากล เรขาคณิต ชัดเจนทุกมุมมอง' },
  { id: 'ibm', name: 'ไอบีเอ็ม (IBM Plex)', tag: '🌿 เรียบหรูสบายตา', description: 'ฟอนต์สไตล์แอพยุคใหม่ ช่องไฟพอดี อ่านยาวๆ ไม่ล้าตา' },
  { id: 'kanit', name: 'คณิต (Kanit)', tag: '🔥 สปอร์ตวัยรุ่น', description: 'ฟอนต์ยอดฮิต โดดเด่น ชัดเจน มีพลัง' },
];

interface ThemeContextType {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  fontStyle: FontStyleOption;
  setFontStyle: (style: FontStyleOption) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  fontSize: 'normal',
  setFontSize: () => {},
  fontStyle: 'mitr',
  setFontStyle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>(() => {
    return (localStorage.getItem('sukjai_font_size') as FontSizeOption) || 'normal';
  });

  const [fontStyle, setFontStyleState] = useState<FontStyleOption>(() => {
    return (localStorage.getItem('sukjai_font_style') as FontStyleOption) || 'mitr';
  });

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size);
    localStorage.setItem('sukjai_font_size', size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const setFontStyle = (style: FontStyleOption) => {
    setFontStyleState(style);
    localStorage.setItem('sukjai_font_style', style);
    document.documentElement.setAttribute('data-font-style', style);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-font-style', fontStyle);
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
