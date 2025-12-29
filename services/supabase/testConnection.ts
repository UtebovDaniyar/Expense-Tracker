// Test Supabase connection
import { supabase } from './config';

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('Testing Supabase connection...');

    // Try to get session (should work even without auth)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session check failed:', sessionError);
      return {
        success: false,
        message: 'Failed to connect to Supabase',
        details: sessionError,
      };
    }

    console.log('Supabase connection successful');
    return {
      success: true,
      message: 'Connected to Supabase successfully',
      details: {
        hasSession: !!sessionData.session,
      },
    };
  } catch (error: any) {
    console.error('Supabase connection test failed:', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
      details: error,
    };
  }
}
