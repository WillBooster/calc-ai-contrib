/**
 * Simple logging utility that respects verbose flag
 */
export class Logger {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Log message only if verbose mode is enabled
   */
  log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }

  /**
   * Always log important messages regardless of verbose mode
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Always log errors regardless of verbose mode
   */
  error(message: string, error?: unknown): void {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }

  /**
   * Always log warnings regardless of verbose mode
   */
  warn(message: string): void {
    console.warn(message);
  }
}
