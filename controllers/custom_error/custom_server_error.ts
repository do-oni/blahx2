export default class CustomServerError extends Error {
  public statusCode: number;

  public location?: string; // 300번대 에러일 때의 리다이렉션 용도

  constructor({ message, statusCode = 500, location }: { statusCode?: number; message: string; location?: string }) {
    super(message);
    this.statusCode = statusCode;
    this.location = location;
    Object.setPrototypeOf(this, CustomServerError.prototype);
  }

  serializeErrors(): { message: string } | string {
    return { message: this.message };
  }
}
