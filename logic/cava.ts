import AstalCava from "gi://AstalCava"
import GLib from "gi://GLib"

// Type for WebView (WebKit2.WebView with correct run_javascript signature)
interface WebView {
    run_javascript(script: string, cancellable: any, callback: any): void
}

/**
 * Audio Visualizer using Astal Cava Library
 * Ported from Lua implementation to TypeScript
 */
export class CavaVisualizer {
    private cava: AstalCava.Cava | null = null
    private previousValues: number[] = []
    private timeoutId: number | null = null
    private isActive = false

    /**
     * Initialize audio visualizer for a single WebView
     */
    init(webview: WebView): void {
        console.log("Cava init called...")
        
        try {
            // Get the default Cava instance
            this.cava = AstalCava.get_default()
            
            if (!this.cava) {
                console.error("AstalCava library not found. Audio visualization disabled.")
                console.error("Install AstalCava library to enable audio visualization.")
                return
            }

            console.log("AstalCava instance obtained successfully")

            // Configure Cava settings
            this.cava.set_bars(8)        // Match number of cubes
            this.cava.set_framerate(60)  // High framerate for smooth visualization
            this.cava.set_autosens(true) // Auto-adjust sensitivity
            this.cava.set_active(true)   // Start audio capture

            console.log(`Audio visualizer initialized with ${this.cava.get_bars()} bars at ${this.cava.get_framerate()} fps`)

            // Initialize previous values array
            this.previousValues = new Array(8).fill(0)
            this.isActive = true

            // Start polling for audio values
            this.startPolling([webview], 16) // ~60 FPS (16ms interval)

            console.log("Audio visualizer polling started at 60 FPS")
        } catch (error) {
            console.error("Failed to initialize Cava:", error)
            console.error("Error details:", error instanceof Error ? error.message : String(error))
        }
    }

    /**
     * Initialize audio visualizer for multiple WebViews
     */
    initForMultipleWebviews(webviews: WebView[]): void {
        if (!webviews || webviews.length === 0) {
            console.log("No WebViews provided for audio visualization")
            return
        }

        try {
            // Get the default Cava instance
            this.cava = AstalCava.get_default()
            
            if (!this.cava) {
                console.error("AstalCava library not found. Audio visualization disabled.")
                console.error("Install AstalCava library to enable audio visualization.")
                return
            }

            // Configure Cava settings for maximum responsiveness
            this.cava.set_bars(8)         // Match number of cubes
            this.cava.set_framerate(120)  // Ultra-high framerate for snappy response
            this.cava.set_autosens(true)  // Re-enable auto-adjust for better audio detection
            this.cava.set_active(true)    // Start audio capture

            console.log(`Audio visualizer initialized for ${webviews.length} WebViews with ${this.cava.get_bars()} bars at ${this.cava.get_framerate()} fps`)

            // Initialize previous values array
            this.previousValues = new Array(8).fill(0)
            this.isActive = true

            // Start polling for audio values at 120 FPS
            this.startPolling(webviews, 8) // ~120 FPS (8ms interval)

            console.log(`Audio visualizer polling started at 120 FPS for ${webviews.length} WebViews`)
        } catch (error) {
            console.error("Failed to initialize Cava for multiple webviews:", error)
        }
    }

    /**
     * Start polling for audio values and update WebViews
     */
    private startPolling(webviews: WebView[], intervalMs: number): void {
        const updateAudioValues = (): boolean => {
            if (!this.isActive || !this.cava) {
                console.log("Polling stopped: not active or no cava instance")
                return false // Stop polling
            }

            try {
                const values = this.cava.get_values()
                
                if (values && values.length > 0) {
                    // Determine max change based on polling rate
                    const maxChange = intervalMs === 8 ? 1.2 : 0.8 // Higher responsiveness for 120 FPS
                    
                    // Smooth out sudden spikes to prevent "freaking out" but keep it snappy
                    const smoothedValues: number[] = []
                    
                    for (let i = 0; i < values.length; i++) {
                        const value = values[i]
                        const prevValue = this.previousValues[i] || 0
                        
                        // Clamp the value change to prevent sudden spikes
                        const clampedValue = Math.max(
                            prevValue - maxChange,
                            Math.min(prevValue + maxChange, value)
                        )
                        
                        smoothedValues[i] = clampedValue
                        this.previousValues[i] = clampedValue
                    }

                    // Convert smoothed values to JSON string for JavaScript
                    const jsonValues = JSON.stringify(smoothedValues)
                    
                    // Create JavaScript code to inject
                    const jsCode = `if(window.updateAudioFromAstal) window.updateAudioFromAstal(${jsonValues});`
                    
                    // Send to all WebViews
                    for (let i = 0; i < webviews.length; i++) {
                        const webview = webviews[i]
                        if (webview) {
                            try {
                                // Cast to any to bypass TypeScript checks for the method signature
                                const webviewAny = webview as any
                                // WebKit2.WebView.run_javascript requires: script, cancellable, callback
                                webviewAny.run_javascript(jsCode, null, null)
                            } catch (error) {
                                console.warn(`Warning: Failed to send audio data to WebView ${i}:`, error)
                            }
                        }
                    }
                } else {
                    // Silently continue if no audio values
                }
            } catch (error) {
                console.warn("Error updating audio values:", error)
            }

            return true // Continue polling
        }

        // Start the polling loop using GLib timeout
        this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, updateAudioValues)
    }

    /**
     * Stop the audio visualizer and cleanup resources
     */
    stop(): void {
        this.isActive = false
        
        if (this.timeoutId !== null) {
            GLib.source_remove(this.timeoutId)
            this.timeoutId = null
        }
        
        if (this.cava) {
            this.cava.set_active(false)
            this.cava = null
        }
        
        console.log("Audio visualizer stopped and cleaned up")
    }

    /**
     * Check if the visualizer is currently active
     */
    isRunning(): boolean {
        return this.isActive && this.cava !== null
    }

    /**
     * Get current audio values (for debugging)
     */
    getCurrentValues(): number[] {
        if (!this.cava) {
            return []
        }
        
        try {
            return this.cava.get_values()
        } catch (error) {
            console.warn("Error getting current values:", error)
            return []
        }
    }
}

// Export convenience functions for backward compatibility
export function initCava(webview: WebView): CavaVisualizer {
    console.log("initCava convenience function called")
    const visualizer = new CavaVisualizer()
    visualizer.init(webview)
    return visualizer
}

export function initCavaForMultipleWebviews(webviews: WebView[]): CavaVisualizer {
    const visualizer = new CavaVisualizer()
    visualizer.initForMultipleWebviews(webviews)
    return visualizer
}

// Export default instance for simple usage
export const cavaVisualizer = new CavaVisualizer()