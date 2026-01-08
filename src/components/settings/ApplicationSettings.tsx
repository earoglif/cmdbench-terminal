import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Language } from '@/stores/settingsStore';
import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'upToDate';

const ApplicationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettingsStore();
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  React.useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setLanguage(newLanguage);
  };

  const checkForUpdates = async () => {
    try {
      setUpdateStatus('checking');
      setErrorMessage('');
      
      const update = await check();
      
      if (update) {
        setUpdateStatus('available');
        setUpdateVersion(update.version);
      } else {
        setUpdateStatus('upToDate');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setUpdateStatus('idle'), 5000);
    }
  };

  const installUpdate = async () => {
    try {
      setUpdateStatus('downloading');
      const update = await check();
      
      if (!update) {
        setUpdateStatus('upToDate');
        return;
      }

      let downloaded = 0;
      let contentLength = 0;
      
      await update.downloadAndInstall((event: DownloadEvent) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(`Started downloading ${contentLength} bytes`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            console.log(`Downloaded ${downloaded} of ${contentLength}`);
            break;
          case 'Finished':
            console.log('Download finished');
            setUpdateStatus('ready');
            break;
        }
      });

      console.log('Update installed, please restart the application manually');
    } catch (error) {
      console.error('Update installation failed:', error);
      setUpdateStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setUpdateStatus('idle'), 5000);
    }
  };

  const getStatusMessage = () => {
    switch (updateStatus) {
      case 'checking':
        return t('applicationSettings.checkForUpdates') + '...';
      case 'available':
        return `${t('applicationSettings.updateAvailable')}: ${updateVersion}`;
      case 'downloading':
        return t('applicationSettings.downloading');
      case 'ready':
        return t('applicationSettings.restartRequired');
      case 'error':
        return `${t('applicationSettings.updateError')}: ${errorMessage}`;
      case 'upToDate':
        return t('applicationSettings.upToDate');
      default:
        return '';
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

      <div className="space-y-4">
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text font-semibold">{t('applicationSettings.version')}</span>
          </label>
          <div className="text-base-content/80">
            {t('applicationSettings.currentVersion')}: {currentVersion || '...'}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="btn btn-primary w-full max-w-xs"
            onClick={checkForUpdates}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
          >
            {updateStatus === 'checking' ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : null}
            {t('applicationSettings.checkForUpdates')}
          </button>

          {updateStatus === 'available' && (
            <button
              className="btn btn-success w-full max-w-xs"
              onClick={installUpdate}
            >
              {t('applicationSettings.installUpdate')}
            </button>
          )}

          {updateStatus === 'downloading' && (
            <div className="flex items-center gap-2 text-base-content/80">
              <span className="loading loading-spinner loading-sm"></span>
              <span>{t('applicationSettings.downloading')}</span>
            </div>
          )}

          {(updateStatus === 'upToDate' || updateStatus === 'error' || updateStatus === 'available' || updateStatus === 'ready') && (
            <div className={`alert ${updateStatus === 'error' ? 'alert-error' : updateStatus === 'available' ? 'alert-info' : updateStatus === 'ready' ? 'alert-warning' : 'alert-success'} w-full max-w-xs`}>
              <span className="text-sm">{getStatusMessage()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;

