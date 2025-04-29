import { browserAPI } from '../browser-polyfill';

/**
 * ブラウザストレージにアクセスするための統一インターフェース
 * Chromeでもfirefoxでも同じ方法でアクセス可能
 */
export class StorageManager {
  // フォールバック用のプレフィックス
  private static readonly FALLBACK_PREFIX = 'fallback_music_x1_';

  /**
   * ストレージコンテキストを確認 (background/content/popup)
   * backgroundコンテキストではlocalStorageは使用できない
   */
  private static isBackgroundContext(): boolean {
    // Service Workerコンテキストか確認 (MV3のChrome)
    if (typeof self !== 'undefined' && typeof window === 'undefined') {
      return true;
    }

    // document/windowオブジェクトが存在しないか確認 (Firefox background)
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return true;
    }

    return false;
  }

  /**
   * localStorageが利用可能かチェック
   */
  private static isLocalStorageAvailable(): boolean {
    if (this.isBackgroundContext()) {
      return false;
    }

    try {
      // localStorageの存在確認
      if (typeof localStorage === 'undefined') {
        return false;
      }

      // localStorageが利用可能か機能テスト
      const testKey = `${this.FALLBACK_PREFIX}_test`;
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      return testValue === 'test';
    } catch {
      // エラーは無視して、単に利用不可と判断
      return false;
    }
  }

  /**
   * 永続的なストレージからデータを取得
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      // まずsyncストレージを試す
      const result = await browserAPI.storage.sync.get([key]);
      if (result[key] !== undefined) {
        return result[key] as T;
      }

      // syncストレージになければlocalストレージを確認
      const localResult = await browserAPI.storage.local.get([key]);
      if (localResult[key] !== undefined) {
        return localResult[key] as T;
      }

      // 最終的にはlocalStorageも確認 (利用可能な場合のみ)
      if (this.isLocalStorageAvailable()) {
        const fallbackValue = localStorage.getItem(`${this.FALLBACK_PREFIX}${key}`);
        if (fallbackValue) {
          try {
            return JSON.parse(fallbackValue) as T;
          } catch {
            return fallbackValue as unknown as T;
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`[StorageManager] Error getting "${key}":`, error);
      return null;
    }
  }

  /**
   * 永続的なストレージにデータを保存
   */
  static async set<T>(key: string, value: T): Promise<boolean> {
    try {
      // syncストレージへの保存を試す
      await browserAPI.storage.sync.set({ [key]: value });

      // エラーが発生せずに成功した場合はtrueを返す
      return true;
    } catch (syncError) {
      console.warn(`[StorageManager] Sync storage failed for "${key}", trying fallbacks:`, syncError);

      try {
        // localストレージへの保存を試す
        await browserAPI.storage.local.set({ [key]: value });
        return true;
      } catch (localError) {
        console.warn(`[StorageManager] Local storage failed for "${key}", trying localStorage:`, localError);

        // localStorageが利用可能な場合のみ試行
        if (this.isLocalStorageAvailable()) {
          try {
            // localStorage にフォールバック
            localStorage.setItem(`${this.FALLBACK_PREFIX}${key}`, JSON.stringify(value));
            return true;
          } catch (fallbackError) {
            console.error(`[StorageManager] All storage methods failed for "${key}":`, fallbackError);
          }
        } else {
          console.warn(`[StorageManager] localStorage not available in this context, skipping fallback`);
        }

        return false;
      }
    }
  }

  /**
   * 永続的なストレージからデータを削除
   */
  static async remove(key: string): Promise<boolean> {
    try {
      // 全てのストレージから削除を試みる
      await browserAPI.storage.sync.remove(key);
      await browserAPI.storage.local.remove(key);

      // localStorageが利用可能な場合のみ削除
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(`${this.FALLBACK_PREFIX}${key}`);
      }

      return true;
    } catch (error) {
      console.error(`[StorageManager] Error removing "${key}":`, error);
      return false;
    }
  }

  /**
   * 全てのストレージをクリア
   */
  static async clear(): Promise<boolean> {
    try {
      // 拡張機能のマネージドストレージは全てクリア
      const syncStorage = await browserAPI.storage.sync.get(null);
      const localStorage = await browserAPI.storage.local.get(null);

      const syncKeys = Object.keys(syncStorage as object);
      const localKeys = Object.keys(localStorage as object);

      if (syncKeys.length > 0) {
        await browserAPI.storage.sync.remove(syncKeys);
      }

      if (localKeys.length > 0) {
        await browserAPI.storage.local.remove(localKeys);
      }

      // localStorage のフォールバックエントリをクリア (利用可能な場合のみ)
      if (this.isLocalStorageAvailable()) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(this.FALLBACK_PREFIX)) {
            window.localStorage.removeItem(key);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('[StorageManager] Error clearing storage:', error);
      return false;
    }
  }
}
