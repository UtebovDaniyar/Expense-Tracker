// Network Service - Monitor network connectivity
import NetInfo from '@react-native-community/netinfo';

type NetworkCallback = (isOnline: boolean) => void;

export class NetworkService {
  private static isOnlineState: boolean = true;
  private static listeners: Set<NetworkCallback> = new Set();
  private static unsubscribe: (() => void) | null = null;

  /**
   * Initialize network monitoring
   * Should be called once on app startup
   */
  static initialize(): void {
    if (this.unsubscribe) {
      console.warn('NetworkService already initialized');
      return;
    }

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnlineState;
      this.isOnlineState = state.isConnected ?? false;

      console.log('Network state changed:', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });

      // Notify listeners if state changed
      if (wasOnline !== this.isOnlineState) {
        this.notifyListeners();
      }
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      this.isOnlineState = state.isConnected ?? false;
      console.log('Initial network state:', this.isOnlineState);
    });
  }

  /**
   * Check if device is currently online
   */
  static isOnline(): boolean {
    return this.isOnlineState;
  }

  /**
   * Subscribe to network state changes
   * Returns unsubscribe function
   */
  static onNetworkChange(callback: NetworkCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of network state change
   */
  private static notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.isOnlineState);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Cleanup - stop monitoring
   * Should be called on app shutdown (rarely needed)
   */
  static cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}
