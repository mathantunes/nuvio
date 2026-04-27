import { getSession } from "@/lib/session";

export class AuthService {
  /**
   * Get the current authenticated user from the iron-session cookie.
   * Throws if the user is not authenticated.
   */
  static async getCurrentUser() {
    const session = await getSession();
    if (!session.userId) {
      throw new Error("User not authenticated");
    }
    return { id: session.userId, email: session.email };
  }
}
