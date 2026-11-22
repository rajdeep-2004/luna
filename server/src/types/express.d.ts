declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Present on every protected route. */
      userId?: string;
    }
  }
}
export {};
