import { useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTerminalStore } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface TerminalInstanceExtended {
  id: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  ptyId: string;
  container: HTMLDivElement;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T & { cancel: () => void };
  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  return debounced;
}

export const useMultipleTerminals = () => {
  const { tabs, activeTabId, removeTab, updateTabTitleFromPath } = useTerminalStore();
  const { terminalFont, theme } = useSettingsStore();
  const terminalsRef = useRef<Map<string, TerminalInstanceExtended>>(new Map());
  const ptyToTabMapRef = useRef<Map<string, string>>(new Map()); // Map ptyId -> tabId
  const tabsRef = useRef(tabs); // Ref для актуального количества вкладок
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const activeReadLoopsRef = useRef<Set<string>>(new Set()); // Активные циклы чтения
  
  // Обновление шрифта для всех активных терминалов при изменении настроек
  useEffect(() => {
    terminalsRef.current.forEach((instance) => {
      if (instance.terminal) {
        instance.terminal.options.fontFamily = terminalFont.family;
        instance.terminal.options.fontSize = terminalFont.size;
        instance.terminal.options.lineHeight = terminalFont.lineHeight;
        
        // Перерасчет размеров после изменения шрифта
        if (instance.fitAddon && instance.container.style.visibility === 'visible') {
          try {
            const prevRows = instance.terminal.rows;
            const prevCols = instance.terminal.cols;
            
            instance.fitAddon.fit();
            
            const newRows = instance.terminal.rows;
            const newCols = instance.terminal.cols;
            
            if (prevRows !== newRows || prevCols !== newCols) {
              invoke("async_resize_pty", {
                ptyId: instance.ptyId,
                rows: newRows,
                cols: newCols,
              }).catch(console.error);
            }
          } catch (error) {
            console.error("Error refitting terminal after font change:", error);
          }
        }
      }
    });
  }, [terminalFont]);

  // Обновление темы терминалов при изменении темы приложения
  useEffect(() => {
    const terminalTheme = theme === 'dark' 
      ? {
          background: '#1d232a', // DaisyUI dark theme base-100
          foreground: '#a6adba',
          cursor: '#a6adba',
          cursorAccent: '#1d232a',
          selectionBackground: 'rgba(166, 173, 186, 0.3)',
        }
      : {
          background: '#ffffff', // DaisyUI light theme base-100
          foreground: '#1f2937',
          cursor: '#1f2937',
          cursorAccent: '#ffffff',
          selectionBackground: 'rgba(0, 0, 0, 0.2)',
        };

    terminalsRef.current.forEach((instance) => {
      if (instance.terminal) {
        instance.terminal.options.theme = terminalTheme;
      }
    });
  }, [theme]);

  // Обновляем ref при изменении tabs
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // Проверяем готовность containerRef
  useEffect(() => {
    if (containerRef.current && !isReady) {
      setIsReady(true);
    }
  }, [isReady]);

  // Функция запуска цикла чтения для PTY
  const startReadLoop = useCallback((ptyId: string, terminal: Terminal) => {
    if (activeReadLoopsRef.current.has(ptyId)) return;
    activeReadLoopsRef.current.add(ptyId);
    
    const readLoop = async () => {
      while (activeReadLoopsRef.current.has(ptyId)) {
        try {
          // Вызов блокируется на стороне Rust до получения данных
          const data = await invoke<string | null>("async_read_from_pty", { ptyId });
          
          if (data === null) {
            // Канал закрыт — выходим из цикла
            break;
          }
          
          if (data && activeReadLoopsRef.current.has(ptyId)) {
            terminal.write(data);
          }
        } catch (error) {
          console.error("Error reading from PTY:", error);
          break;
        }
      }
      activeReadLoopsRef.current.delete(ptyId);
    };
    
    // Запускаем асинхронный цикл чтения
    readLoop();
  }, []);

  // Создание терминала
  const createTerminalInstance = useCallback(async (tabId: string, shellPath?: string): Promise<TerminalInstanceExtended> => {
    if (!containerRef.current) {
      throw new Error("Container not ready");
    }

    const fitAddon = new FitAddon();
    
    // Определяем тему терминала в зависимости от темы приложения
    const terminalTheme = theme === 'dark'
      ? {
          background: '#1d232a', // DaisyUI dark theme base-100
          foreground: '#a6adba',
          cursor: '#a6adba',
          cursorAccent: '#1d232a',
          selectionBackground: 'rgba(166, 173, 186, 0.3)',
        }
      : {
          background: '#ffffff', // DaisyUI light theme base-100
          foreground: '#1f2937',
          cursor: '#1f2937',
          cursorAccent: '#ffffff',
          selectionBackground: 'rgba(0, 0, 0, 0.2)',
        };
    
    const terminal = new Terminal({
      fontFamily: terminalFont.family,
      fontSize: terminalFont.size,
      lineHeight: terminalFont.lineHeight,
      theme: terminalTheme,
    });
    
    terminal.loadAddon(fitAddon);

    // Создаем контейнер для этого терминала
    // ВАЖНО: создаём видимым чтобы xterm.js мог правильно рассчитать размеры
    const container = document.createElement('div');
    container.className = 'terminal-container';
    container.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; margin: 0.5rem;';
    container.dataset.tabId = tabId;
    
    containerRef.current.appendChild(container);
    terminal.open(container);
    
    // Получаем реальные размеры терминала через fit()
    fitAddon.fit();
    const rows = terminal.rows;
    const cols = terminal.cols;

    // Создаем PTY с правильными размерами
    let ptyId: string;
    try {
      ptyId = await invoke<string>("async_create_shell", { shellPath, rows, cols });
      ptyToTabMapRef.current.set(ptyId, tabId);
      // Запускаем цикл чтения данных из PTY
      startReadLoop(ptyId, terminal);
    } catch (error) {
      console.error("Error creating shell:", error);
      container.remove();
      terminal.dispose();
      throw error;
    }

    const instance: TerminalInstanceExtended = {
      id: tabId,
      terminal,
      fitAddon,
      ptyId,
      container
    };

    // Обработка ввода терминала
    terminal.onData((data: string) => {
      invoke("async_write_to_pty", { ptyId, data }).catch(console.error);
    });

    // Скрываем контейнер - видимость будет управляться через updateVisibility
    container.style.visibility = 'hidden';

    // Получаем рабочую директорию и обновляем заголовок вкладки
    invoke<string>("async_get_pty_cwd", { ptyId })
      .then((cwd) => {
        if (cwd) {
          updateTabTitleFromPath(tabId, cwd);
        }
      })
      .catch((error) => {
        console.error("Error getting PTY CWD:", error);
      });

    return instance;
  }, [startReadLoop, updateTabTitleFromPath, terminalFont, theme]);

  // Получение или создание терминала для таба
  const getOrCreateTerminal = useCallback(async (tabId: string, shellPath?: string): Promise<TerminalInstanceExtended | null> => {
    if (!containerRef.current) return null;
    
    let instance = terminalsRef.current.get(tabId);
    if (!instance) {
      try {
        instance = await createTerminalInstance(tabId, shellPath);
        terminalsRef.current.set(tabId, instance);
      } catch (error) {
        console.error("Failed to create terminal:", error);
        return null;
      }
    }
    return instance;
  }, [createTerminalInstance]);

  // Обновление видимости терминалов
  const updateVisibility = useCallback((activeId: string | null) => {
    terminalsRef.current.forEach((instance, tabId) => {
      const isActive = tabId === activeId;
      instance.container.style.visibility = isActive ? 'visible' : 'hidden';
    });
  }, []);

  // Инициализация и синхронизация терминалов с табами
  useEffect(() => {
    if (!isReady || !activeTabId) return;

    const syncTerminals = async () => {
      // Создаем терминалы для всех табов, которых ещё нет (кроме табов настроек)
      for (const tab of tabs) {
        if (!tab.isSettings && !terminalsRef.current.has(tab.id)) {
          await getOrCreateTerminal(tab.id, tab.shellProfile?.path);
        }
      }
      
      // Обновляем видимость после создания
      updateVisibility(activeTabId);
    };

    syncTerminals();
  }, [tabs, activeTabId, isReady, getOrCreateTerminal, updateVisibility]);

  // Обновление видимости при смене активного таба
  useEffect(() => {
    if (!isReady) return;
    updateVisibility(activeTabId);
    
    // Дополнительная подгонка размера с небольшой задержкой
    // для случаев, когда DOM еще не успел обновиться
    if (activeTabId) {
      const timeoutId = setTimeout(() => {
        const activeInstance = terminalsRef.current.get(activeTabId);
        if (activeInstance && activeInstance.container.style.visibility === 'visible') {
          try {
            const prevRows = activeInstance.terminal.rows;
            const prevCols = activeInstance.terminal.cols;
            
            activeInstance.fitAddon.fit();
            
            const newRows = activeInstance.terminal.rows;
            const newCols = activeInstance.terminal.cols;
            
            if (prevRows !== newRows || prevCols !== newCols) {
              invoke("async_resize_pty", {
                ptyId: activeInstance.ptyId,
                rows: newRows,
                cols: newCols,
              }).catch(console.error);
            }
          } catch (error) {
            console.error("Error fitting terminal on tab activation:", error);
          }
        }
      }, 50); // Небольшая задержка для стабилизации DOM
      
      return () => clearTimeout(timeoutId);
    }
    
    // Возвращаем пустую функцию очистки, если activeTabId отсутствует
    return () => {};
  }, [activeTabId, isReady, updateVisibility]);

  // Fit активного терминала после изменения видимости (useLayoutEffect выполняется синхронно после DOM-мутаций)
  useLayoutEffect(() => {
    if (!isReady || !activeTabId) return;
    
    const activeInstance = terminalsRef.current.get(activeTabId);
    if (!activeInstance || activeInstance.container.style.visibility === 'hidden') return;
    
    try {
      const prevRows = activeInstance.terminal.rows;
      const prevCols = activeInstance.terminal.cols;
      
      // Принудительно подгоняем размер терминала при активации вкладки
      // Это необходимо, если размер окна изменился пока вкладка была неактивна
      activeInstance.fitAddon.fit();
      
      const newRows = activeInstance.terminal.rows;
      const newCols = activeInstance.terminal.cols;
      
      // Обновляем PTY только если размеры изменились
      if (prevRows !== newRows || prevCols !== newCols) {
        invoke("async_resize_pty", {
          ptyId: activeInstance.ptyId,
          rows: newRows,
          cols: newCols,
        }).catch(console.error);
      }
      
      activeInstance.terminal.focus();
    } catch (error) {
      console.error("Error fitting terminal on visibility change:", error);
    }
  }, [activeTabId, isReady]);

  // Команда запуска
  const runCommand = useCallback((command: string) => {
    if (!command.trim() || !activeTabId) return;
    
    const activeTerminal = terminalsRef.current.get(activeTabId);
    if (activeTerminal) {
      invoke("async_write_to_pty", { 
        ptyId: activeTerminal.ptyId, 
        data: command + "\r" 
      }).catch(console.error);
    }
  }, [activeTabId]);

  // Обработка изменения размера окна с дебаунсом
  const fitActiveTerminal = useCallback(() => {
    if (!activeTabId) return;
    
    const activeTerminal = terminalsRef.current.get(activeTabId);
    if (activeTerminal?.fitAddon && activeTerminal?.terminal && activeTerminal.container.style.visibility !== 'hidden') {
      try {
        // Сохраняем текущие размеры для сравнения
        const prevRows = activeTerminal.terminal.rows;
        const prevCols = activeTerminal.terminal.cols;
        
        activeTerminal.fitAddon.fit();
        
        const newRows = activeTerminal.terminal.rows;
        const newCols = activeTerminal.terminal.cols;
        
        // Обновляем PTY только если размеры реально изменились
        if (prevRows !== newRows || prevCols !== newCols) {
          invoke("async_resize_pty", {
            ptyId: activeTerminal.ptyId,
            rows: newRows,
            cols: newCols,
          }).catch(console.error);
        }
      } catch (error) {
        console.error("Error fitting terminal:", error);
      }
    }
  }, [activeTabId]);

  // Дебаунсированная версия для resize событий
  const debouncedFitRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    debouncedFitRef.current = debounce(fitActiveTerminal, 100);
    return () => {
      debouncedFitRef.current?.cancel();
    };
  }, [fitActiveTerminal]);

  const handleResize = useCallback(() => {
    debouncedFitRef.current?.();
  }, []);

  // Используем ResizeObserver для отслеживания изменений размера контейнера
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Используем requestAnimationFrame для стабилизации DOM
      requestAnimationFrame(() => {
        debouncedFitRef.current?.();
      });
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  // Очистка удалённых табов
  useEffect(() => {
    const currentTabIds = new Set(tabs.map(tab => tab.id));
    
    terminalsRef.current.forEach((instance, terminalId) => {
      if (!currentTabIds.has(terminalId)) {
        // Останавливаем цикл чтения
        activeReadLoopsRef.current.delete(instance.ptyId);
        
        // Удаляем связь ptyId -> tabId
        ptyToTabMapRef.current.delete(instance.ptyId);
        
        // Удаляем PTY
        invoke("async_remove_pty", { ptyId: instance.ptyId }).catch(console.error);
        
        // Очищаем DOM и терминал
        instance.terminal.dispose();
        instance.container.remove();
        terminalsRef.current.delete(terminalId);
      }
    });
  }, [tabs]);

  // Обработка события завершения PTY
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    
    const setupListener = async () => {
      const unlisten = await listen<string>("pty-exited", async (event) => {
        const ptyId = event.payload;
        const tabId = ptyToTabMapRef.current.get(ptyId);
        
        if (tabId) {
          // Получаем актуальное количество вкладок из ref
          const currentTabsCount = tabsRef.current.length;
          
          // Если осталась только одна вкладка, закрываем приложение
          if (currentTabsCount === 1) {
            const window = getCurrentWindow();
            await window.close();
          } else {
            // Иначе закрываем текущую вкладку
            removeTab(tabId);
          }
        }
      });
      unlistenFn = unlisten;
    };
    
    setupListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [removeTab]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      // Останавливаем все циклы чтения
      activeReadLoopsRef.current.clear();
      ptyToTabMapRef.current.clear();
      
      terminalsRef.current.forEach((instance) => {
        invoke("async_remove_pty", { ptyId: instance.ptyId }).catch(console.error);
        instance.terminal.dispose();
        instance.container.remove();
      });
      terminalsRef.current.clear();
    };
  }, []);

  return {
    containerRef,
    runCommand,
  };
};
