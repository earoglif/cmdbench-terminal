import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ApplicationSettings from './ApplicationSettings';
import AppearanceSettings from './AppearanceSettings';
import CommandsSettings from './CommandsSettings';
import ShortcutsSettings from './ShortcutsSettings';

type SettingsSection = 'application' | 'appearance' | 'commands' | 'shortcuts';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('application');

  const sections: SettingsSection[] = ['application', 'appearance', 'commands', 'shortcuts'];

  const renderSectionContent = () => {
    switch (selectedSection) {
      case 'application':
        return <ApplicationSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'commands':
        return <CommandsSettings />;
      case 'shortcuts':
        return <ShortcutsSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full flex bg-base-100">
      <div className="w-64 bg-base-200 border-r border-base-300">
        <ul className="menu p-4 h-full">
          {sections.map((section) => (
            <li key={section}>
              <a
                className={selectedSection === section ? 'active' : ''}
                onClick={() => setSelectedSection(section)}
              >
                {t(`settings.sections.${section}`)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {renderSectionContent()}
      </div>
    </div>
  );
};

export default Settings;

