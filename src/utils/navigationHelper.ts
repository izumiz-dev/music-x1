import { browserAPI } from '../browser-polyfill';

/**
 * ブラウザ間の違いを吸収する画面遷移ヘルパー
 */
export class NavigationHelper {
  /**
   * オプション画面を開く
   * どのブラウザでも同じ方法で呼び出し可能
   */
  static async openOptionsPage(): Promise<void> {
    try {
      if (typeof browser !== 'undefined') {
        // Firefox
        return await browser.runtime.openOptionsPage();
      } else if (typeof chrome !== 'undefined') {
        // Chrome
        return new Promise<void>((resolve) => {
          chrome.runtime.openOptionsPage(() => {
            resolve();
          });
        });
      } else {
        // フォールバック
        console.warn('[NavigationHelper] Unknown browser environment, fallback to URL redirect');
        const optionsUrl = browserAPI.runtime.getURL('options.html');
        window.open(optionsUrl, '_blank');
        return Promise.resolve();
      }
    } catch (error) {
      console.error('[NavigationHelper] Error opening options page:', error);

      // フォールバック
      try {
        const optionsUrl = browserAPI.runtime.getURL('options.html');
        window.open(optionsUrl, '_blank');
      } catch (fallbackError) {
        console.error('[NavigationHelper] Fallback also failed:', fallbackError);
        throw error; // 元のエラーを再スロー
      }
    }
  }

  /**
   * 新しいタブでURLを開く
   * @param url 開きたいURL
   */
  static openNewTab(url: string): void {
    try {
      if (typeof browser !== 'undefined') {
        // Firefox
        browser.tabs.create({ url });
      } else if (typeof chrome !== 'undefined') {
        // Chrome
        chrome.tabs.create({ url });
      } else {
        // フォールバック
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error(`[NavigationHelper] Error opening tab (${url}):`, error);
      // フォールバック
      window.open(url, '_blank');
    }
  }
}
