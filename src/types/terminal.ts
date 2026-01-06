export interface ShellProfile {
  name: string;
  path: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  isActive: boolean;
  shellProfile?: ShellProfile;
  isSettings?: boolean;
}

export interface TerminalInstance {
  id: string;
  terminal: any; // xterm Terminal instance
  fitAddon: any; // FitAddon instance
}