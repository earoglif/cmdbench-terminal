import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Language } from '@/stores/settingsStore';

const ApplicationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setLanguage(newLanguage);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('applicationSettings.title')}</h2>
      
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text font-semibold">{t('applicationSettings.language')}</span>
        </label>
        <select
          className="select select-bordered w-full max-w-xs"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
        <label className="label">
          <span className="label-text-alt text-base-content/60">{t('applicationSettings.languageDescription')}</span>
        </label>
      </div>
    </div>
  );
};

export default ApplicationSettings;

