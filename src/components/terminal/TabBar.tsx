import React, { FC, useState, useRef, useLayoutEffect, useEffect, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { platform } from '@tauri-apps/plugin-os';
import { useTerminalStore } from '@/stores/terminalStore';
import { useCommands } from '@hooks/useCommands';
import { ShellProfile } from '@/types/terminal';
import { Command } from '@/stores/commandsStore';
import { MenuIcon, PlusIcon, MinimizeIcon, MaximizeIcon, RestoreIcon, CloseIcon } from '@/shared/icons';
import { HiOutlineX } from 'react-icons/hi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
// @ts-ignore - @dnd-kit/modifiers types may not be immediately available
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTabItemProps {
  tab: { id: string; title: string };
  isActive: boolean;
  onDoubleClick: (tabId: string) => void;
  onClick: (e: MouseEvent, tabId: string) => void;
  onRemove: (tabId: string) => void;
  tabsCount: number;
}

interface TabBarProps {
  onCommandClick?: (command: Command) => void;
}

const SortableTabItem: FC<SortableTabItemProps> = ({
  tab,
  isActive,
  onDoubleClick,
  onClick,
  onRemove,
  tabsCount,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  const handleDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick(tab.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex items-center px-4 py-2 border-r border-base-300 cursor-move min-w-0 ${
        isActive 
          ? 'bg-base-100 text-primary' 
          : 'hover:bg-base-300'
      } ${isDragging ? 'z-50' : ''}`}
      onClick={(e) => onClick(e, tab.id)}
      onDoubleClick={handleDoubleClick}
      title={tab.title}
    >
      <span className="text-sm truncate flex-1">
        {tab.title}
      </span>
      {tabsCount > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tab.id);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className="btn btn-ghost btn-xs p-0 min-h-0 w-0 group-hover:w-4 h-4 overflow-hidden hover:bg-base-300 transition-all ml-2 flex items-center justify-center group"
        >
          <HiOutlineX className="w-3 h-3 group-hover:text-red-500 transition-colors" />
        </button>
      )}
    </div>
  );
};

const TabBar: FC<TabBarProps> = ({ onCommandClick }) => {
  const { t } = useTranslation();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, renameTab, reorderTabs, addSettingsTab } = useTerminalStore();
  const { data: commandsData } = useCommands();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shellProfiles, setShellProfiles] = useState<ShellProfile[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    invoke<ShellProfile[]>('get_shell_profiles')
      .then(setShellProfiles)
      .catch(console.error);
  }, []);

  useEffect(() => {
    let unlistenPromise: Promise<() => void> | null = null;

    // Определяем ОС
    const checkPlatform = async () => {
      const currentPlatform = await platform();
      const isMac = currentPlatform === 'macos';
      setIsMacOS(isMac);

      // На macOS используем нативные кнопки окна (titleBarStyle: overlay)
      // поэтому не нужно отслеживать состояние maximize
      if (isMac) {
        return;
      }

      const checkMaximized = async () => {
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      };
      checkMaximized();

      unlistenPromise = getCurrentWindow().onResized(async () => {
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      });
    };

    checkPlatform();

    return () => {
      if (unlistenPromise) {
        unlistenPromise.then(fn => fn());
      }
    };
  }, []);

  const closeMenu = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleProfileClick = (profile: ShellProfile) => {
    addTab(profile);
    closeMenu();
  };

  const handleSettingsClick = () => {
    addSettingsTab();
    closeMenu();
  };

  const handleCommandClick = (command: Command) => {
    closeMenu();
    onCommandClick?.(command);
  };

  const handleClick = (_e: MouseEvent, tabId: string) => {
    setActiveTab(tabId);
  };

  const handleDoubleClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setEditingTabId(tabId);
      setEditingTitle(tab.title);
      setModalOpen(true);
      if (dialogRef.current) {
        dialogRef.current.showModal();
      }
    }
  };

  const handleSave = () => {
    if (editingTabId && editingTitle.trim()) {
      renameTab(editingTabId, editingTitle.trim());
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    setModalOpen(false);
    setEditingTabId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCloseModal();
    }
  };

  useLayoutEffect(() => {
    if (modalOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [modalOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen && dialogRef.current?.open) {
        e.preventDefault();
        e.stopPropagation();
        handleCloseModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleGlobalKeyDown, true);
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [modalOpen]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderTabs(active.id as string, over.id as string);
    }
    setActiveId(null);
  };

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  };

  const handleClose = () => {
    getCurrentWindow().close();
  };

  const tabIds = tabs.map(tab => tab.id);
  const activeTab = activeId ? tabs.find(tab => tab.id === activeId) : null;

  const DndContextFixed = DndContext as any;
  const DragOverlayFixed = DragOverlay as any;

  return (
    <div 
      className={`bg-base-200 border-b border-base-300 flex items-center ${isMacOS ? 'pl-20' : 'px-1'}`}
    >
      <DndContextFixed
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center overflow-hidden flex-1">
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onDoubleClick={handleDoubleClick}
                onClick={handleClick}
                onRemove={removeTab}
                tabsCount={tabs.length}
              />
            ))}
          </SortableContext>
          
          {/* Кнопка добавления нового таба */}
          <button
            onClick={() => addTab()}
            className="flex items-center justify-center px-3 py-2 hover:bg-base-300 text-primary flex-shrink-0"
            title={t('tabBar.addNewTerminal')}
          >
            <PlusIcon />
          </button>

          {/* Spacer для перетаскивания окна */}
          <div 
            className="flex-1 h-full min-h-[40px] cursor-default"
            onMouseDown={(e) => {
              if (e.button === 0 && e.detail === 1) {
                e.preventDefault();
                getCurrentWindow().startDragging();
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              void handleMaximize();
            }}
          />
        </div>
        <DragOverlayFixed>
          {activeTab ? (
            <div className="group flex items-center px-4 py-2 border-r border-base-300 cursor-move min-w-0 bg-base-100 text-primary opacity-90">
              <span className="text-sm truncate">
                {activeTab.title}
              </span>
            </div>
          ) : null}
        </DragOverlayFixed>
      </DndContextFixed>

      {/* Dropdown меню */}
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm px-2 hover:bg-base-300">
          <MenuIcon className="w-4 h-4" />
        </div>
        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52 max-h-[80vh] overflow-y-auto" style={{ gridTemplateColumns: '1fr', display: 'grid' }}>
          <li><a onClick={handleSettingsClick}>{t('menu.settings')}</a></li>
          
          {(() => {
            const commandsWithoutGroups = commandsData.commands.filter(cmd => 
              !cmd.groups || cmd.groups.length === 0
            );
            const hasGroups = commandsData.groups.length > 0;
            const hasCommandsWithoutGroups = commandsWithoutGroups.length > 0;
            
            if (!hasGroups && !hasCommandsWithoutGroups) return null;
            
            return (
              <>
                <li className="menu-title">{t('menu.commands')}</li>
                {commandsData.groups.map((group) => {
                  const groupCommands = commandsData.commands.filter(cmd => 
                    group.commandIds.includes(cmd.id)
                  );
                  
                  if (groupCommands.length === 0) return null;
                  
                  return (
                    <li key={group.id}>
                      <details>
                        <summary>
                          {group.name}
                        </summary>
                        <ul>
                          {groupCommands.map((command) => (
                            <li key={command.id}>
                              <a 
                                onClick={() => handleCommandClick(command)}
                              >
                                {command.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  );
                })}
                {commandsWithoutGroups.map((command) => (
                  <li key={command.id}>
                    <a onClick={() => handleCommandClick(command)}>
                      {command.name}
                    </a>
                  </li>
                ))}
              </>
            );
          })()}
          
          <li className="menu-title">{t('menu.profiles')}</li>
          {shellProfiles.map((profile) => (
            <li key={profile.path}>
              <a onClick={() => handleProfileClick(profile)}>{profile.name}</a>
            </li>
          ))}
          {/* <li className="menu-title">{t('menu.shortcuts')}</li>
          <li><span className="text-xs opacity-70">{t('menu.newTab')}</span></li>
          <li><span className="text-xs opacity-70">{t('menu.closeTab')}</span></li>
          <li><span className="text-xs opacity-70">{t('menu.nextTab')}</span></li>
          <li><span className="text-xs opacity-70">{t('menu.switchTab')}</span></li> */}
        </ul>
      </div>

      {/* Кнопки управления окном (только для Windows/Linux) */}
      {!isMacOS && (
        <>
          <button
            onClick={handleMinimize}
            className="btn btn-ghost btn-sm px-2 hover:bg-base-300"
            title={t('window.minimize')}
          >
            <MinimizeIcon />
          </button>
          <button
            onClick={handleMaximize}
            className="btn btn-ghost btn-sm px-2 hover:bg-base-300"
            title={isMaximized ? t('window.restore') : t('window.maximize')}
          >
            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm px-2 hover:bg-error hover:text-error-content"
            title={t('window.close')}
          >
            <CloseIcon />
          </button>
        </>
      )}

      {/* Модальное окно для редактирования заголовка таба */}
      <dialog 
        ref={dialogRef}
        className={`modal ${modalOpen ? 'modal-open' : ''}`}
        onCancel={handleCloseModal}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">{t('tabBar.editTabTitle')}</h3>
          <input
            ref={inputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input input-bordered w-full"
            placeholder={t('tabBar.editTabTitle')}
            autoFocus
          />
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCloseModal}
            >
              {t('tabBar.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!editingTitle.trim()}
            >
              {t('tabBar.save')}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={handleCloseModal}>
          <button type="button">close</button>
        </form>
      </dialog>
    </div>
  );
};

export default TabBar;
