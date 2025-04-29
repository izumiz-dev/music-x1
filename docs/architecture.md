# Music x1 Technical Architecture

## Detection System Overview

The extension uses a sophisticated detection system combining YouTube's category data and AI-based content analysis to identify music videos and automatically adjust playback speed.

```mermaid
flowchart TD
    Start[New YouTube Video] --> Cache{Check Cache}
    Cache -->|Hit| UseCached[Use Cached Result]
    Cache -->|Miss| GetDetails[Get Video Details]

    UseCached -->|Music| Speed1[Speed: 1x]
    UseCached -->|Non-Music| Speed2[Speed: User Default]

    GetDetails --> Category{Is Music<br>Category?}

    Category -->|Yes| Music[Set as Music]
    Category -->|No| Gemini[Use Gemini AI]

    Gemini --> Analysis{AI Analysis}
    Analysis -->|Music| Music
    Analysis -->|Non-Music| NonMusic[Set as Non-Music]

    Music --> Cache1[Update Cache]
    NonMusic --> Cache2[Update Cache]

    Cache1 --> Speed1
    Cache2 --> Speed2

    Speed2 --> Range[Range: 1x-3x<br>0.1x increments]
```

## Security & API Key Management

The extension implements a robust security system for handling API keys with encryption and secure memory management.

```mermaid
flowchart TD
    Start[API Key Request] --> Cache{Check Memory Cache}
    Cache -->|Hit & Valid| ReturnCached[Return Cached Key]
    Cache -->|Miss or Expired| Storage[Fetch from Storage]

    Storage --> Encrypted{Is Key Available?}
    Encrypted -->|Yes| Decrypt[Decrypt Key]
    Encrypted -->|No| Empty[Return Empty]

    Decrypt --> ValidDecrypt{Decryption Success?}
    ValidDecrypt -->|Yes| UpdateCache[Update Memory Cache]
    ValidDecrypt -->|No| Empty

    UpdateCache --> ReturnDecrypted[Return Decrypted Key]

    Shutdown[Extension Shutdown] --> ClearCache[Clear Memory Cache]
```

1. **Secure Key Storage**:
   - API keys are never stored in plaintext
   - AES-GCM encryption with 256-bit keys
   - Unique encryption key for each stored value
   - Full encryption structure:
     ```typescript
     {
       data: Uint8Array,  // Encrypted API key
       iv: Uint8Array,    // Initialization vector
       key: Uint8Array    // Encryption key (wrapped)
     }
     ```

2. **Memory Safety Features**:
   - In-memory caching with 30-minute expiry
   - Automatic cache clearing on extension startup/shutdown
   - API keys only briefly in memory during use
   - Cache data structure:
     ```typescript
     interface KeyCache {
       value: string;     // Decrypted key
       timestamp: number; // Time when cached
     }
     ```

3. **Key Management Classes**:
   - Centralized `ApiKeyManager` class
   - Typed key enumeration for different API services
   - `crypto.ts` utility for encryption operations
   - Zero-trust approach with explicit cleanup operations

## Content Detection Details

1. **Cache-First Approach**:
   - Every video check starts with a cache lookup
   - Cache validity period: 28 days
   - Cache data structure:
     ```typescript
     interface CacheData {
       isMusic: boolean;
       timestamp: number;
       detectionMethod: 'youtube' | 'gemini';
     }
     ```
   - Benefits:
     - Zero external API calls when cache hit
     - Immediate playback speed setting
     - Reduced API quota usage

2. **Fresh Detection Flow**:
   - Triggered on cache miss or expired cache
   - Sequential detection steps:
     1. YouTube Category Check
        - Uses YouTube Data API
        - Category ID 10 = Music content
        - Most reliable when available
     2. Gemini AI Analysis
        - Used when YouTube category is non-music/unclear
        - Analyzes video title using structured prompt
        - Handles multiple languages (JP, EN, etc.)

3. **Error Handling & Retry Logic**:
   - YouTube API:
     - Quota exceeded detection (403 response)
     - Network error recovery
     - Invalid response handling
   - Gemini API:
     - Automatic retry (up to 2 times)
     - Exponential backoff (1s, 2s delays)
     - Fallback to default speed on failure

## Extension State Management

The extension implements a global toggle system that allows users to enable or disable all functionality at once:

```mermaid
flowchart TD
    Toggle[Toggle Switch] --> State{Extension<br>Enabled?}
    State -->|Yes| EnableFeatures[Enable All Features]
    State -->|No| DisableFeatures[Disable All Features]

    DisableFeatures --> ResetSpeed[Reset Playback to 1x]
    DisableFeatures --> HideBadge[Hide Badge]
    DisableFeatures --> DisableSlider[Disable Speed Controls]
    DisableFeatures --> GrayIcon[Show Gray Icon]

    EnableFeatures --> RestoreBadge[Restore Badge]
    EnableFeatures --> EnableDetection[Enable Detection]
    EnableFeatures --> EnableControls[Enable Speed Controls]
    EnableFeatures --> ColorIcon[Show Color Icon]

    VideoChange[New Video] --> CheckState{Is Extension<br>Enabled?}
    CheckState -->|Yes| RunDetection[Run Detection Flow]
    CheckState -->|No| Skip[Skip Detection<br>Keep at 1x]
```

1. **Global State Management**:
   - Centralized `extensionEnabled` state in Chrome storage
   - Default enabled (true) if not explicitly set
   - Synchronized across all components

2. **Toggle Behavior**:
   - When disabled:
     - All videos play at 1x speed regardless of content type
     - Speed slider becomes disabled with overlay message
     - Badge icon is hidden
     - Extension icon changes to grayscale
     - All playback rate change requests are ignored
   - When enabled:
     - Normal detection and speed adjustment resumes
     - Badge and controls are restored
     - Extension icon returns to colored version
     - Current video is re-analyzed

3. **Implementation Details**:
   - Popup component handles UI state and toggle interactions
   - Background script enforces global state across all tabs
   - Content script respects global state for all speed changes
   - Special handling for 1x reset when disabling

## Visual Feedback System

The extension provides real-time feedback through the browser extension icon:

- **Icon Variations**:
  - Colored icon: Extension is enabled
  - Grayscale icon: Extension is disabled

- **Icon Badge**:
  - 🎵 (Green): Music content detected
  - 🎞️ (Gray): Non-music content
  - Badge shows detection method on hover (youtube/gemini)
  - Badge is hidden when extension is disabled

- **Popup Interface**:
  - Shows current content type
  - For non-music: Adjustable speed slider (1x-3x, 0.1x steps)
  - For music: Fixed at 1x with visual indicator
  - Global extension toggle switch (enabled/disabled)
  - Disabled state overlay for speed controls
  - API configuration status

## Performance Optimizations

1. **Icon Update Throttling**:
   - Icon updates are tracked and throttled to minimize browser resource usage
   - Minimum time between icon updates is enforced (2 seconds)
   - Current icon state is stored to prevent redundant updates

2. **Duplicate Processing Prevention**:
   - Active video processing is tracked to prevent redundant processing
   - Unique tab ID and video ID combinations are used as tracking keys
   - Processing is skipped if the same video is already being handled

3. **Navigation Message Optimization**:
   - Recent URL processing is tracked to prevent rapid duplicate processing
   - Navigation events include response handling with retry mechanisms
   - Single notification with error-based retry instead of multiple parallel attempts

4. **Tab Update Debouncing**:
   - Tab update events are debounced with a 500ms window
   - Global time-based filtering prevents too frequent processing
   - YouTube-specific handling reduces processing on non-relevant sites

## Implementation Details

1. **Content Script** (`content.ts`):
   - Handles YouTube SPA navigation
   - Manages video element detection
   - Implements playback rate controls
   - Uses MutationObserver for dynamic content
   - Includes delayed re-application of playback rate to handle YouTube's own rate resets

2. **Background Process** (`background.ts`):
   - Manages content detection flow
   - Handles cache operations
   - Coordinates API calls
   - Updates visual indicators with throttling
   - Tracks processing state to avoid redundant operations

3. **API Integrations**:
   - YouTube Data API (`youtube.ts`):
     - Video category retrieval
     - Error handling with retries
     - Secure API key retrieval
   - Gemini API (`gemini.ts`):
     - Structured content analysis
     - JSON response schema
     - Retry mechanism with backoff
     - Secure API key retrieval

4. **Security Components**:
   - API Key Manager (`apiKeyManager.ts`):
     - Secure key storage and retrieval
     - Memory cache with timed expiry
     - Type-safe API key handling
   - Crypto Utilities (`crypto.ts`):
     - AES-GCM encryption/decryption
     - Binary data handling
     - Error recovery for crypto operations
   - Extension State Management:
     - Persistent state storage via Chrome Storage API
     - Global toggle to completely disable functionality
     - Cross-component state synchronization

5. **User Interface** (`popup.tsx` & `options.tsx`):
   - Real-time playback control
   - Visual feedback
   - Settings access
   - Responsive speed adjustment
   - Global extension toggle switch
   - Disabled state UI indications
   - Secure API key configuration

## Error Recovery

The system implements multiple layers of error recovery:

1. **API Failures**:
   - Automatic retries with backoff
   - Fallback to alternative detection methods
   - Cache utilization when APIs are unavailable
   - Extension toggle for complete bypass when needed

2. **Content Script**:
   - Automatic reinitialization on navigation
   - Multiple attempts for video element detection
   - Message retry mechanism for speed updates
   - Delayed re-application of playback rate settings

3. **Cache Management**:
   - Graceful degradation on cache miss
   - Automatic cache cleanup
   - Cache validation before use

4. **Icon and Badge Updates**:
   - Throttled updates to prevent excessive resource usage
   - State tracking to minimize redundant operations
   - Direct badge manipulation for toggle operations
