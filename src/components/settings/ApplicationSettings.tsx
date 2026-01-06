import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Language } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { remoteControlService } from '@/shared/services/remoteControl';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const ApplicationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage, remoteControlEnabled, setRemoteControlEnabled } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | undefined>();

  useEffect(() => {
    const handleStatusChange = (status: ConnectionStatus, error?: string) => {
      setConnectionStatus(status);
      setConnectionError(error);
    };

    remoteControlService.addStatusListener(handleStatusChange);

    return () => {
      remoteControlService.removeStatusListener(handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (remoteControlEnabled && isAuthenticated) {
      remoteControlService.connect();
    } else {
      remoteControlService.disconnect();
    }
  }, [remoteControlEnabled, isAuthenticated]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setLanguage(newLanguage);
  };

  const handleRemoteControlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRemoteControlEnabled(e.target.checked);
  };

  const getStatusBadgeClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'badge-success';
      case 'connecting':
        return 'badge-warning';
      case 'error':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
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

      <div className="divider"></div>

      <div className="form-control w-full max-w-md">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={remoteControlEnabled}
            onChange={handleRemoteControlChange}
            disabled={!isAuthenticated}
          />
          <span className="label-text font-semibold">{t('applicationSettings.remoteControl')}</span>
        </label>
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            {t('applicationSettings.remoteControlDescription')}
          </span>
        </label>
        
        {!isAuthenticated && (
          <div className="alert alert-warning mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{t('applicationSettings.remoteControlLoginRequired')}</span>
          </div>
        )}

        {isAuthenticated && remoteControlEnabled && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`badge ${getStatusBadgeClass()}`}>
              {t(`applicationSettings.remoteStatus.${connectionStatus}`)}
            </span>
            {connectionError && connectionStatus === 'error' && (
              <span className="text-error text-sm">{connectionError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationSettings;

