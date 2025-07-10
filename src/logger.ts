/**
 * Simple logging utility that respects verbose flag
 */
export class Logger {
  private _verbose: boolean;

  constructor(verbose: boolean = false) {
    this._verbose = verbose;
  }

  /**
   * Get the verbose flag value
   */
  get verbose(): boolean {
    return this._verbose;
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
