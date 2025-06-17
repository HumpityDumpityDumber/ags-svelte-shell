import QtQuick
import Quickshell
import Quickshell.Io

QtObject {
    id: niriWorkspace
    
    property int currentWorkspace: 0
    property bool connected: false
    property var workspaceMap: ({})  // Map workspace id to idx
    property var workspaces: []  // List of all workspaces for dot display
    
    // Signal to notify when workspaces change
    signal workspacesUpdated()
    
    // Get NIRI_SOCKET environment variable
    property string niriSocketPath: {
        // Try NIRI_SOCKET first, fallback to XDG_RUNTIME_DIR/niri/niri.sock
        var socket = Quickshell.env("NIRI_SOCKET")
        if (socket) return socket
        
        var runtimeDir = Quickshell.env("XDG_RUNTIME_DIR") || "/run/user/" + Quickshell.env("UID")
        return runtimeDir + "/niri/niri.sock"
    }
    
    // Direct socket connection to Niri IPC
    property Socket niriSocket: Socket {
        path: niriSocketPath
        
        parser: SplitParser {
            splitMarker: "\n"
            onRead: function(data) {
                niriWorkspace.handleNiriResponse(data.trim())
            }
        }
        
        onConnectedChanged: {
            if (connected) {
                console.log("Connected to Niri IPC socket:", path)
                niriWorkspace.connected = true
                
                // Request initial workspace state
                niriWorkspace.requestWorkspaces()
                
                // Start event stream
                niriWorkspace.requestEventStream()
            } else {
                console.log("Disconnected from Niri IPC socket")
                niriWorkspace.connected = false
                
                // Attempt reconnection after delay
                reconnectTimer.start()
            }
        }
        
        onError: function(error) {
            console.warn("Niri socket error:", error)
            reconnectTimer.start()
        }
        
        Component.onCompleted: {
            connected = true
        }
    }
    
    // Timer for reconnection attempts
    property Timer reconnectTimer: Timer {
        interval: 2000
        repeat: false
        onTriggered: {
            if (!niriSocket.connected) {
                console.log("Attempting to reconnect to Niri IPC")
                niriSocket.connected = true
            }
        }
    }
    
    // Send JSON request to Niri
    function sendRequest(request) {
        if (!niriSocket.connected) {
            console.warn("Cannot send request - not connected to Niri socket")
            return
        }
        
        var jsonRequest = JSON.stringify(request)
        console.log("Sending Niri request:", jsonRequest)
        niriSocket.write(jsonRequest + "\n")
        niriSocket.flush()
    }
    
    // Request workspace list
    function requestWorkspaces() {
        sendRequest("Workspaces")
    }
    
    // Request event stream
    function requestEventStream() {
        sendRequest("EventStream")
    }
    
    // Handle responses from Niri
    function handleNiriResponse(jsonData) {
        if (!jsonData || jsonData.length === 0) return
        
        try {
            var response = JSON.parse(jsonData)
            
            // Handle wrapped responses
            if (response.Ok !== undefined) {
                handleSuccessResponse(response.Ok)
            } else if (response.Err !== undefined) {
                console.warn("Niri error response:", response.Err)
            } else {
                // Direct event (from event stream)
                handleNiriEvent(response)
            }
        } catch (e) {
            console.warn("Failed to parse Niri response:", e, "Data:", jsonData)
        }
    }
    
    // Handle successful responses
    function handleSuccessResponse(data) {
        if (data.Workspaces !== undefined) {
            var workspaceList = data.Workspaces
            console.log("Received workspaces:", workspaceList.length, "workspaces")
            
            // Store the workspace list for dot display
            workspaces = workspaceList
            
            // Build workspace mapping
            workspaceMap = {}
            for (var i = 0; i < workspaceList.length; i++) {
                workspaceMap[workspaceList[i].id] = workspaceList[i].idx
                if (workspaceList[i].is_focused) {
                    currentWorkspace = workspaceList[i].idx
                    console.log("Initial current workspace detected:", currentWorkspace)
                }
            }
            
            workspacesUpdated()
        }
    }
    
    // Handle events from event stream
    function handleNiriEvent(event) {
        if (event.WorkspaceActivated) {
            var workspaceId = event.WorkspaceActivated.id
            
            // Look up the idx from our workspace map
            if (workspaceMap[workspaceId] !== undefined) {
                var newWorkspace = workspaceMap[workspaceId]
                
                // Find the workspace object to get monitor/output information
                var workspaceObj = null
                for (var i = 0; i < workspaces.length; i++) {
                    if (workspaces[i].id === workspaceId) {
                        workspaceObj = workspaces[i]
                        break
                    }
                }
                
                if (newWorkspace !== currentWorkspace) {
                    var monitorInfo = workspaceObj && workspaceObj.output ? workspaceObj.output : "unknown monitor"
                    console.log("Workspace changed:", currentWorkspace, "→", newWorkspace, "on", monitorInfo)
                    currentWorkspace = newWorkspace
                }
            }
            
            // Update focus state in workspaces array
            for (var i = 0; i < workspaces.length; i++) {
                workspaces[i].is_focused = (workspaces[i].id === workspaceId)
            }
            
            // Force property change notification by reassigning the array
            var updatedWorkspaces = workspaces.slice()
            workspaces = updatedWorkspaces
            workspacesUpdated()
            
        } else if (event.WorkspacesChanged) {
            var workspaceList = event.WorkspacesChanged.workspaces
            
            // Store the complete workspace list for dot display
            workspaces = workspaceList
            
            // Update workspace mapping
            workspaceMap = {}
            for (var i = 0; i < workspaceList.length; i++) {
                workspaceMap[workspaceList[i].id] = workspaceList[i].idx
                if (workspaceList[i].is_focused) {
                    var newWorkspace = workspaceList[i].idx
                    if (newWorkspace !== currentWorkspace) {
                        console.log("Workspace changed (WorkspacesChanged):", currentWorkspace, "→", newWorkspace)
                        currentWorkspace = newWorkspace
                    }
                }
            }
            
            // Emit signal for workspace updates
            workspacesUpdated()
        }
    }
    
    // Cleanup function
    function cleanup() {
        console.log("Cleaning up NiriWorkspaceProcess")
        if (niriSocket.connected) {
            niriSocket.connected = false
        }
        reconnectTimer.stop()
    }
    
    Component.onDestruction: {
        cleanup()
    }
}
