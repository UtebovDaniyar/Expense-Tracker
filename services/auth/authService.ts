// Authentication service for managing user authentication with Supabase
import { supabase } from '@/services/supabase/config';
import { AuthError, User, Session } from '@supabase/supabase-js';

export interface AuthErrorResponse {
  code: string;
  message: string;
}

export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user || !data.session) throw new Error('No user data returned');

      return { user: data.user, session: data.session };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user: User; session: Session | null }> {
    try {
      console.log('AuthService: Calling Supabase signUp...');

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Request timeout - please check your internet connection')),
          30000
        );
      });

      // Race between signup and timeout
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || '',
          },
        },
      });

      const { data, error } = (await Promise.race([signUpPromise, timeoutPromise])) as any;

      console.log('AuthService: Supabase response:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message,
      });

      if (error) {
        console.error('AuthService: Supabase error:', error);
        throw error;
      }
      if (!data?.user) {
        console.error('AuthService: No user data returned');
        throw new Error('No user data returned');
      }

      console.log('AuthService: Sign up successful');
      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('AuthService: Exception caught:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'pennywise://reset-password',
      });
      if (error) throw error;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user is currently signed in');

      // Supabase automatically sends verification email on signup
      // This method can be used to resend if needed
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      });

      if (error) throw error;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.displayName,
          avatar_url: updates.photoURL,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update email
   */
  static async updateEmail(newEmail: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(): Promise<void> {
    try {
      // Note: Supabase doesn't have a built-in delete user method from client
      // This would typically be done through a server-side function
      // For now, we'll sign out the user
      await this.signOut();
      throw new Error('Account deletion must be done through support');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session !== null;
  }

  /**
   * Check if email is verified
   */
  static async isEmailVerified(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.email_confirmed_at !== undefined;
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        'Supabase auth event:',
        event,
        'hasSession:',
        !!session,
        'hasUser:',
        !!session?.user
      );

      // Ignore TOKEN_REFRESHED events to prevent excessive state updates
      // Only react to actual auth state changes (SIGNED_IN, SIGNED_OUT, etc.)
      if (event === 'TOKEN_REFRESHED') {
        return; // Don't trigger callback for token refresh
      }

      // Log sign out event (this is normal when user clicks Sign Out)
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }

      callback(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle Supabase auth errors and convert to user-friendly messages
   */
  private static handleAuthError(error: any): AuthErrorResponse {
    console.log('Handling auth error:', error);

    const errorCode = error.code || error.status || 'unknown';
    let message = 'An unexpected error occurred';

    // Check for network errors first
    if (error.message && error.message.includes('fetch')) {
      return {
        code: 'network_error',
        message: 'Network error. Please check your internet connection and try again.',
      };
    }

    // Supabase error codes
    switch (errorCode) {
      case 'invalid_credentials':
      case '400':
        message = 'Invalid email or password';
        break;
      case 'email_exists':
      case 'user_already_exists':
        message = 'This email is already registered';
        break;
      case 'invalid_email':
        message = 'Invalid email address';
        break;
      case 'weak_password':
        message = 'Password is too weak';
        break;
      case 'user_not_found':
        message = 'No account found with this email';
        break;
      case 'email_not_confirmed':
        message = 'Please verify your email address';
        break;
      case 'over_request_rate_limit':
        message = 'Too many requests. Please try again later';
        break;
      case 'network_error':
        message = 'Network error. Please check your connection';
        break;
      default:
        message = error.message || message;
    }

    return {
      code: errorCode,
      message,
    };
  }
}
