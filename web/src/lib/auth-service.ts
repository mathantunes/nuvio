import { createClient } from "@/lib/supabase-server";

export class AuthService {
  /**
   * Get the current authenticated user
   * @returns The user object or throws if not authenticated
   */
  static async getCurrentUser() {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    return user;
  }
}
