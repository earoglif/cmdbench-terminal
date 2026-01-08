import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Theme, type TerminalFontSettings } from '@/stores/settingsStore';
import { FiSun, FiMoon } from 'react-icons/fi';

const FONT_FAMILIES = [
  { value: 'Consolas, Monaco, "Courier New", monospace', label: 'Consolas' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Monaco, Consolas, monospace', label: 'Monaco' },
  { value: '"Fira Code", monospace', label: 'Fira Code' },
  { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
  { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
  { value: 'Menlo, Monaco, monospace', label: 'Menlo' },
  { value: 'monospace', label: 'System Monospace' },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

const LINE_HEIGHTS = [
  { value: 1.0, label: '1.0 (Compact)' },
  { value: 1.1, label: '1.1' },
  { value: 1.2, label: '1.2 (Default)' },
  { value: 1.3, label: '1.3' },
  { value: 1.4, label: '1.4' },
  { value: 1.5, label: '1.5 (Comfortable)' },
  { value: 1.6, label: '1.6' },
  { value: 1.8, label: '1.8' },
  { value: 2.0, label: '2.0 (Spacious)' },
];

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, terminalFont, setTheme, setTerminalFont } = useSettingsStore();
  const [localFont, setLocalFont] = useState<TerminalFontSettings>(terminalFont);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = { ...localFont, family: e.target.value };
    setLocalFont(newFont);
    setTerminalFont(newFont);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = { ...localFont, size: parseInt(e.target.value) };
    setLocalFont(newFont);
    setTerminalFont(newFont);
  };

  const handleLineHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = { ...localFont, lineHeight: parseFloat(e.target.value) };
    setLocalFont(newFont);
    setTerminalFont(newFont);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('appearanceSettings.title')}</h2>
      
      {/* Theme Selection */}
      <div className="form-control w-full max-w-md">
        <label className="label">
          <span className="label-text font-semibold">{t('appearanceSettings.theme')}</span>
        </label>
        <div className="flex gap-3">
          <button
            className={`btn flex-1 ${
              theme === 'dark' ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => handleThemeChange('dark')}
          >
            <FiMoon className="mr-2" size={18} />
            {t('appearanceSettings.themeDark')}
          </button>
          <button
            className={`btn flex-1 ${
              theme === 'light' ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => handleThemeChange('light')}
          >
            <FiSun className="mr-2" size={18} />
            {t('appearanceSettings.themeLight')}
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            {t('appearanceSettings.themeDescription')}
          </span>
        </label>
      </div>

      {/* Divider */}
      <div className="divider"></div>

      {/* Terminal Font Settings */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{t('appearanceSettings.terminalFont')}</h3>
        <p className="text-sm text-base-content/60">
          {t('appearanceSettings.terminalFontDescription')}
        </p>

        {/* Font Family */}
        <div className="form-control w-full max-w-md">
          <label className="label">
            <span className="label-text font-semibold">
              {t('appearanceSettings.fontFamily')}
            </span>
          </label>
          <select
            className="select select-bordered w-full"
            value={localFont.family}
            onChange={handleFontFamilyChange}
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              {t('appearanceSettings.fontFamilyDescription')}
            </span>
          </label>
        </div>

        {/* Font Size */}
        <div className="form-control w-full max-w-md">
          <label className="label">
            <span className="label-text font-semibold">
              {t('appearanceSettings.fontSize')}
            </span>
          </label>
          <select
            className="select select-bordered w-full"
            value={localFont.size}
            onChange={handleFontSizeChange}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              {t('appearanceSettings.fontSizeDescription')}
            </span>
          </label>
        </div>

        {/* Line Height */}
        <div className="form-control w-full max-w-md">
          <label className="label">
            <span className="label-text font-semibold">
              {t('appearanceSettings.lineHeight')}
            </span>
          </label>
          <select
            className="select select-bordered w-full"
            value={localFont.lineHeight}
            onChange={handleLineHeightChange}
          >
            {LINE_HEIGHTS.map((lh) => (
              <option key={lh.value} value={lh.value}>
                {lh.label}
              </option>
            ))}
          </select>
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              {t('appearanceSettings.lineHeightDescription')}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;

