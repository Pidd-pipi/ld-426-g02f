export type AppErrorCode =
  | 'IMAGE_NOT_FOUND'
  | 'BOARD_NOT_FOUND'
  | 'NO_BOARD_SELECTED'
  | 'PERSISTENCE_FAILED';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
