import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdRefresh } from 'react-icons/md';
import { useSettingsStore, type Language } from '@/stores/settingsStore';
import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { platform } from '@tauri-apps/plugin-os';
import { open } from '@tauri-apps/plugin-shell';

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
      const update = await check();
      
      if (!update) {
        setUpdateStatus('upToDate');
        return;
      }

      const currentPlatform = await platform();
      const isLinux = currentPlatform === 'linux';
      const isMacOS = currentPlatform === 'macos';
      const isWindows = currentPlatform === 'windows';

      // Для Linux и macOS открываем страницу релиза на GitHub в системном браузере
      if (isLinux || isMacOS) {
        const releaseUrl = `https://github.com/earoglif/cmdbench-terminal/releases/tag/v${update.version}`;
        await open(releaseUrl);
        setUpdateStatus('idle');
        return;
      }

      // Для Windows оставляем прежний функционал
      if (isWindows) {
        setUpdateStatus('downloading');
        
        let downloaded = 0;
        let contentLength = 0;

        console.log('installUpdate update:', update);
        
        await update.downloadAndInstall((event: DownloadEvent) => {
          console.log('installUpdate event:', event);
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

        console.log('Update installed, restarting application...');
        await relaunch();
      }
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
        <div className="flex items-center gap-3">
          <span className="text-base-content/70 text-sm">
            {t('applicationSettings.currentVersion')}: <span className="font-mono">{currentVersion || '...'}</span>
          </span>
          <button
            className="btn btn-ghost btn-sm px-2"
            onClick={checkForUpdates}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            aria-label={t('applicationSettings.checkForUpdates')}
            title={t('applicationSettings.checkForUpdates')}
            style={{ minWidth: 0 }}
          >
            {updateStatus === 'checking' ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <MdRefresh className="w-5 h-5 text-base-content" />
            )}
          </button>
        </div>
        {updateStatus === 'available' && (
          <button
            className="btn btn-success btn-sm min-h-0 h-8 px-4"
            onClick={installUpdate}
          >
            {t('applicationSettings.installUpdate')}
          </button>
        )}
        {/* Colored text notifications */}
        {updateStatus === 'downloading' && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <span className="loading loading-spinner loading-xs"></span>
            <span>{t('applicationSettings.downloading')}</span>
          </div>
        )}
        {updateStatus === 'ready' && (
          <div className="text-sm font-medium">
            {getStatusMessage()}
          </div>
        )}
        {updateStatus === 'available' && (
          <div className="text-sm font-medium">
            {getStatusMessage()}
          </div>
        )}
        {updateStatus === 'upToDate' && (
          <div className="text-green-600 dark:text-green-400 text-sm font-medium">
            {getStatusMessage()}
          </div>
        )}
        {updateStatus === 'error' && (
          <div className="text-red-600 dark:text-red-400 text-sm font-medium">
            {getStatusMessage()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationSettings;

