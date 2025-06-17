-- Audio Visualizer using Astal Cava Library
local astal = require("astal")
local GLib = astal.require("GLib")

local M = {}

-- Initialize audio visualizer for a single WebView (original function)
function M.init(webview)
  -- Try to require AstalCava - it might not be installed
  local status, Cava = pcall(function()
    return astal.require("AstalCava")
  end)
  
  if not status then
    print("AstalCava library not found. Audio visualization disabled.")
    print("Install AstalCava library to enable audio visualization.")
    return
  end
  
  -- Get the default Cava instance
  local cava = Cava.get_default()
  
  -- Configure Cava settings
  cava:set_bars(8)        -- Match number of cubes
  cava:set_framerate(60)  -- High framerate for smooth visualization
  cava:set_autosens(true) -- Auto-adjust sensitivity
  cava:set_active(true)   -- Start audio capture
  
  print("Audio visualizer initialized with", cava:get_bars(), "bars at", cava:get_framerate(), "fps")
  
  -- Poll for audio values at regular intervals
  local previous_values = {}
  for i = 1, 8 do
    previous_values[i] = 0
  end
  
  local function update_audio_values()
    local values = cava:get_values()
    if values and #values > 0 then
      -- Smooth out sudden spikes to prevent "freaking out" but keep it snappy
      local smoothed_values = {}
      for i, value in ipairs(values) do
        local prev_value = previous_values[i] or 0
        -- Increased max change limit for maximum responsiveness
        local max_change = 0.8 -- Increased from 0.5 for ultra-responsive audio
        local clamped_value = math.max(prev_value - max_change, math.min(prev_value + max_change, value))
        smoothed_values[i] = clamped_value
        previous_values[i] = clamped_value
      end
      
      -- Convert smoothed values to JSON string for JavaScript
      local json_values = "["
      for i, value in ipairs(smoothed_values) do
        if i > 1 then
          json_values = json_values .. ","
        end
        json_values = json_values .. tostring(value)
      end
      json_values = json_values .. "]"
      
      -- Inject audio data into WebView
      local js_code = string.format(
        "if(window.updateAudioFromAstal) window.updateAudioFromAstal(%s);", 
        json_values
      )
      webview:run_javascript(js_code)
    end
    return true -- Continue polling
  end
  
  -- Poll at 60 FPS for smooth visualization
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, update_audio_values) -- ~60 FPS
  
  print("Audio visualizer polling started at 60 FPS")
end

-- Initialize audio visualizer for multiple WebViews (new function)
function M.init_for_multiple_webviews(webviews)
  if not webviews or #webviews == 0 then
    print("No WebViews provided for audio visualization")
    return
  end
  
  -- Try to require AstalCava - it might not be installed
  local status, Cava = pcall(function()
    return astal.require("AstalCava")
  end)
  
  if not status then
    print("AstalCava library not found. Audio visualization disabled.")
    print("Install AstalCava library to enable audio visualization.")
    return
  end
  
  -- Get the default Cava instance
  local cava = Cava.get_default()
  
  -- Configure Cava settings for maximum responsiveness
  cava:set_bars(8)        -- Match number of cubes
  cava:set_framerate(120) -- Ultra-high framerate for snappy response
  cava:set_autosens(true) -- Re-enable auto-adjust for better audio detection
  cava:set_active(true)   -- Start audio capture
  
  print("Audio visualizer initialized for", #webviews, "WebViews with", cava:get_bars(), "bars at", cava:get_framerate(), "fps")
  
  -- Poll for audio values at regular intervals
  local previous_values = {}
  for i = 1, 8 do
    previous_values[i] = 0
  end
  
  local function update_audio_values()
    local values = cava:get_values()
    if values and #values > 0 then
      -- Ultra-responsive smoothing - allow rapid changes
      local smoothed_values = {}
      for i, value in ipairs(values) do
        local prev_value = previous_values[i] or 0
        -- Increased max change limit for ultra-responsive audio
        local max_change = 1.2 -- Increased from 0.8 for maximum responsiveness
        local clamped_value = math.max(prev_value - max_change, math.min(prev_value + max_change, value))
        smoothed_values[i] = clamped_value
        previous_values[i] = clamped_value
      end
      
      -- Convert smoothed values to JSON string for JavaScript
      local json_values = "["
      for i, value in ipairs(smoothed_values) do
        if i > 1 then
          json_values = json_values .. ","
        end
        json_values = json_values .. tostring(value)
      end
      json_values = json_values .. "]"
      
      -- Inject audio data into ALL WebViews
      local js_code = string.format(
        "if(window.updateAudioFromAstal) window.updateAudioFromAstal(%s);", 
        json_values
      )
      
      -- Send to all WebViews
      for i, webview in ipairs(webviews) do
        if webview then
          local success, error = pcall(function()
            webview:run_javascript(js_code)
          end)
          if not success then
            print("Warning: Failed to send audio data to WebView", i, ":", error)
          end
        end
      end
    end
    return true -- Continue polling
  end
  
  -- Poll at 120 FPS for ultra-smooth visualization
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 8, update_audio_values) -- ~120 FPS
  
  print("Audio visualizer polling started at 120 FPS for", #webviews, "WebViews")
end

return M
