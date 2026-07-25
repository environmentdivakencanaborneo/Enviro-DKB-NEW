/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Enterprise Logger Utility for EEMS
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    return `[EEMS ${level.toUpperCase()}] ${timestamp} - ${message}`;
  }

  debug(message: string, data?: any) {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message), data !== undefined ? data : '');
    }
  }

  info(message: string, data?: any) {
    if (this.isDev) {
      console.info(this.formatMessage('info', message), data !== undefined ? data : '');
    }
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('warn', message), data !== undefined ? data : '');
  }

  error(message: string, error?: any) {
    console.error(this.formatMessage('error', message), error !== undefined ? error : '');
  }
}

export const logger = new Logger();
