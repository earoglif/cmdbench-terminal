import { forwardRef } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import Settings from "@components/settings/Settings";

interface MultipleTerminalsProps {
  className?: string;
}

const MultipleTerminals = forwardRef<HTMLDivElement, MultipleTerminalsProps>(
  ({ className = "" }, ref) => {
    const { tabs, activeTabId } = useTerminalStore();
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    const hasSettingsTab = tabs.some((tab) => tab.isSettings);

    return (
      <div className={`flex-1 overflow-hidden ${className}`}>
        <div ref={ref} className="h-full w-full relative">
          {hasSettingsTab && (
            <div 
              className="absolute inset-0"
              style={{ display: activeTab?.isSettings ? 'block' : 'none' }}
            >
              <Settings />
            </div>
          )}
        </div>
      </div>
    );
  }
);

MultipleTerminals.displayName = "MultipleTerminals";

export default MultipleTerminals;
