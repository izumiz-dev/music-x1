/**
 * 再生速度の管理に関する機能を一元化するヘルパークラス
 * ブラウザの違いを抽象化し、安定した再生速度の設定と取得を提供
 */

import { browserAPI } from './browser-polyfill';
import { StorageManager } from './storage-manager';

export class PlaybackRateManager {
  // デフォルトの再生速度
  private static readonly DEFAULT_RATE = 1.5;
  // 再試行回数の上限
  private static readonly MAX_RETRIES = 3;
  
  /**
   * 現在のタブIDを取得
   */
  private static async getCurrentTabId(): Promise<number | null> {
    try {
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && typeof tabs[0].id === 'number') {
        return tabs[0].id;
      }
      return null;
    } catch (error) {
      console.error('[PlaybackRateManager] Error getting current tab:', error);
      return null;
    }
  }
  
  /**
   * メッセージを送信する試行（リトライロジック付き）
   */
  private static async trySendMessage(tabId: number, message: any, retries = 0): Promise<any> {
    try {
      // コンテンツスクリプトの初期化チェック
      const ready = await browserAPI.tabs.sendMessage(tabId, { type: 'CHECK_READY' }).catch(() => false);
      
      if (!ready && retries < this.MAX_RETRIES) {
        console.log(`[PlaybackRateManager] Content script not ready, retrying (${retries + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1)));
        return this.trySendMessage(tabId, message, retries + 1);
      }
      
      if (!ready) {
        throw new Error('Content script not initialized after max retries');
      }
      
      // メッセージを送信
      return await browserAPI.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        console.log(`[PlaybackRateManager] Error sending message, retrying (${retries + 1}/${this.MAX_RETRIES}):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return this.trySendMessage(tabId, message, retries + 1);
      }
      
      throw error;
    }
  }
  
  /**
   * 保存された再生速度を取得
   */
  static async getDefaultPlaybackRate(): Promise<number> {
    try {
      const rate = await StorageManager.get<number>('defaultPlaybackRate');
      return rate || this.DEFAULT_RATE;
    } catch (error) {
      console.error('[PlaybackRateManager] Error getting default playback rate:', error);
      return this.DEFAULT_RATE;
    }
  }
  
  /**
   * デフォルトの再生速度を保存
   */
  static async saveDefaultPlaybackRate(rate: number): Promise<boolean> {
    try {
      await StorageManager.set('defaultPlaybackRate', rate);
      return true;
    } catch (error) {
      console.error('[PlaybackRateManager] Error saving default playback rate:', error);
      return false;
    }
  }
  
  /**
   * 現在のタブの再生速度を設定
   * @param rate 設定する再生速度
   * @param save デフォルト値として保存するかどうか
   * @param fromDisabledToggle 拡張機能が無効化されたことによる変更かどうか
   */
  static async setCurrentTabPlaybackRate(
    rate: number, 
    save = true, 
    fromDisabledToggle = false
  ): Promise<boolean> {
    try {
      // 拡張機能が有効かどうかチェック
      if (!fromDisabledToggle) {
        const enabled = await StorageManager.get<boolean>('extensionEnabled');
        if (enabled === false) {
          console.log('[PlaybackRateManager] Extension is disabled, not setting playback rate');
          return false;
        }
      }
      
      // 現在のタブIDを取得
      const tabId = await this.getCurrentTabId();
      if (tabId === null) {
        throw new Error('Could not get current tab ID');
      }
      
      // 保存オプションが有効な場合、デフォルト値を保存
      if (save) {
        await this.saveDefaultPlaybackRate(rate);
      }
      
      // 再生速度の設定をリクエスト
      const response = await this.trySendMessage(tabId, {
        type: 'SET_PLAYBACK_RATE',
        rate,
        save,
        fromDisabledToggle
      });
      
      return response?.success || false;
    } catch (error) {
      console.error('[PlaybackRateManager] Error setting playback rate:', error);
      return false;
    }
  }
  
  /**
   * 音楽検出結果に基づいた適切な再生速度を設定
   * @param isMusic 音楽コンテンツかどうか
   */
  static async applyAppropriatePlaybackRate(isMusic: boolean): Promise<boolean> {
    try {
      // 音楽コンテンツの場合は1.0倍速に固定
      if (isMusic) {
        return await this.setCurrentTabPlaybackRate(1.0, false);
      }
      
      // 非音楽コンテンツの場合はデフォルト速度を適用
      const defaultRate = await this.getDefaultPlaybackRate();
      return await this.setCurrentTabPlaybackRate(defaultRate, false);
    } catch (error) {
      console.error('[PlaybackRateManager] Error applying appropriate playback rate:', error);
      return false;
    }
  }
  
  /**
   * 特定のタブでYouTubeの動画を再検出し、適切な再生速度を設定
   * @param tabId タブID
   * @param videoId YouTube動画ID
   */
  static async refreshVideoDetection(tabId: number, videoId: string): Promise<boolean> {
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: 'REFRESH_VIDEO_DETECTION',
        tabId,
        videoId
      });
      
      return response?.success || false;
    } catch (error) {
      console.error('[PlaybackRateManager] Error refreshing video detection:', error);
      return false;
    }
  }
}
