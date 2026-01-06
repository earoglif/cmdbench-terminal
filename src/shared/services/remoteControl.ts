import { io, Socket } from 'socket.io-client';
import { invoke } from '@tauri-apps/api/core';
import { hostname, platform, version, type } from '@tauri-apps/plugin-os';
import { ShellProfile } from '@/types/terminal';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  osType: string;
  osVersion: string;
  hostname: string;
  shellProfiles: ShellProfile[];
}

interface ExecuteCommandPayload {
  deviceId: string;
  command: string;
  shellProfilePath?: string;
  sessionId: string;
}

interface RemoteSession {
  sessionId: string;
  ptyId: string;
  unlistenRead: (() => void) | null;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type StatusListener = (status: ConnectionStatus, error?: string) => void;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class RemoteControlService {
  private socket: Socket | null = null;
  private isEnabled = false;
  private activeSessions: Map<string, RemoteSession> = new Map();
  private statusListeners: Set<StatusListener> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  addStatusListener(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.connectionStatus);
  }

  removeStatusListener(listener: StatusListener) {
    this.statusListeners.delete(listener);
  }

  private notifyStatusChange(status: ConnectionStatus, error?: string) {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status, error));
  }

  async connect() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      this.notifyStatusChange('error', 'Not authenticated');
      return;
    }

    // If there's an existing socket, disconnect it first to ensure fresh connection with current token
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.notifyStatusChange('connecting');

    this.socket = io(API_BASE_URL, {
      auth: {
        token: accessToken,
        isTerminal: true,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', async () => {
      console.log('Remote control connected');
      this.notifyStatusChange('connected');
      await this.registerDevice();
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      console.log('Remote control disconnected');
      this.notifyStatusChange('disconnected');
      this.stopHeartbeat();
      this.cleanupAllSessions();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Remote control connection error:', error);
      this.notifyStatusChange('error', error.message);
    });

    this.socket.on('command:execute' as any, async (data: ExecuteCommandPayload) => {
      await this.handleCommandExecute(data);
    });

    this.socket.on('command:input' as any, (data: { sessionId: string; data: string }) => {
      this.handleCommandInput(data);
    });

    this.socket.on('command:cancel' as any, (data: { sessionId: string }) => {
      this.handleCommandCancel(data);
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.cleanupAllSessions();
    
    if (this.socket) {
      this.socket.emit('device:unregister');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.notifyStatusChange('disconnected');
  }

  private async registerDevice() {
    if (!this.socket) return;

    try {
      const [deviceHostname, platformName, osVersion, osType, shellProfiles] = await Promise.all([
        hostname(),
        platform(),
        version(),
        type(),
        invoke<ShellProfile[]>('get_shell_profiles'),
      ]);

      const deviceInfo: DeviceInfo = {
        deviceId: '',
        deviceName: deviceHostname || 'Unknown Device',
        deviceType: this.getDeviceType(platformName),
        osType: osType,
        osVersion: osVersion,
        hostname: deviceHostname || 'unknown',
        shellProfiles,
      };

      console.log('Registering device:', deviceInfo);
      this.socket.emit('device:register', deviceInfo);
      console.log('Device registration sent');
    } catch (error) {
      console.error('Error registering device:', error);
    }
  }

  private getDeviceType(platform: string): string {
    switch (platform) {
      case 'windows':
        return 'desktop';
      case 'macos':
        return 'desktop';
      case 'linux':
        return 'desktop';
      default:
        return 'unknown';
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('device:heartbeat');
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async handleCommandExecute(data: ExecuteCommandPayload) {
    const { sessionId, command, shellProfilePath } = data;

    try {
      const ptyId = await invoke<string>('async_create_shell', {
        shellPath: shellProfilePath,
        rows: 24,
        cols: 80,
      });

      const session: RemoteSession = {
        sessionId,
        ptyId,
        unlistenRead: null,
      };

      this.activeSessions.set(sessionId, session);

      // On Windows, set UTF-8 code page silently before starting read loop
      const platformName = await platform();
      if (platformName === 'windows') {
        await invoke('async_write_to_pty', {
          ptyId,
          data: 'chcp 65001 >nul 2>&1\r',
        });
        // Wait and discard initial output (chcp command noise)
        await new Promise(resolve => setTimeout(resolve, 300));
        // Read and discard the initial noise
        try {
          await invoke<string | null>('async_read_from_pty', { ptyId });
        } catch {
          // Ignore read errors during initialization
        }
      }

      // Now start the read loop for actual command output
      this.startReadLoop(session);

      // Execute the actual command
      await invoke('async_write_to_pty', {
        ptyId,
        data: command + '\r',
      });
    } catch (error) {
      console.error('Error executing remote command:', error);
      this.socket?.emit('terminal:exit', {
        sessionId,
        exitCode: 1,
      });
    }
  }

  private async startReadLoop(session: RemoteSession) {
    const { sessionId, ptyId } = session;
    let isActive = true;
    let lastOutputTime = Date.now();
    let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
    const INACTIVITY_THRESHOLD = 2000; // 2 seconds of no output = command finished

    const checkInactivity = () => {
      if (!isActive || !this.activeSessions.has(sessionId)) return;
      
      const timeSinceLastOutput = Date.now() - lastOutputTime;
      if (timeSinceLastOutput >= INACTIVITY_THRESHOLD) {
        // Command likely finished, send exit event
        this.socket?.emit('terminal:exit', { sessionId, exitCode: 0 });
        this.cleanupSession(sessionId);
        isActive = false;
      } else {
        // Check again later
        inactivityTimeout = setTimeout(checkInactivity, 500);
      }
    };

    const readLoop = async () => {
      // Start inactivity check after first read attempt
      inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_THRESHOLD);

      while (isActive && this.activeSessions.has(sessionId)) {
        try {
          const data = await invoke<string | null>('async_read_from_pty', { ptyId });
          
          if (data === null) {
            break;
          }
          
          if (data && this.socket?.connected) {
            lastOutputTime = Date.now();
            this.socket.emit('terminal:output', { sessionId, data });
          }
        } catch (error) {
          console.error('Error reading from PTY:', error);
          break;
        }
      }

      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }

      if (isActive && this.activeSessions.has(sessionId)) {
        this.socket?.emit('terminal:exit', { sessionId, exitCode: 0 });
        this.cleanupSession(sessionId);
      }
    };

    session.unlistenRead = () => {
      isActive = false;
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
    };

    readLoop();
  }

  private async handleCommandInput(data: { sessionId: string; data: string }) {
    const session = this.activeSessions.get(data.sessionId);
    if (session) {
      try {
        await invoke('async_write_to_pty', {
          ptyId: session.ptyId,
          data: data.data,
        });
      } catch (error) {
        console.error('Error writing to PTY:', error);
      }
    }
  }

  private async handleCommandCancel(data: { sessionId: string }) {
    this.cleanupSession(data.sessionId);
  }

  private async cleanupSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      if (session.unlistenRead) {
        session.unlistenRead();
      }
      try {
        await invoke('async_remove_pty', { ptyId: session.ptyId });
      } catch (error) {
        console.error('Error removing PTY:', error);
      }
      this.activeSessions.delete(sessionId);
    }
  }

  private cleanupAllSessions() {
    this.activeSessions.forEach((_, sessionId) => {
      this.cleanupSession(sessionId);
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
}

export const remoteControlService = new RemoteControlService();

