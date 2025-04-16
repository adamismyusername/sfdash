/* GitHub integration settings */
let githubSettings = {
    username: 'adamismyusername',
    repo: 'sfdash',
    token: '',
    branch: 'main'
};

/* Tool data array */
let toolsData = [];

/* Available tool colors */
const toolColors = [
    'var(--turquoise)', 'var(--emerald)', 'var(--peter-river)', 'var(--amethyst)', 'var(--wet-asphalt)', 'var(--green-sea)',
    'var(--nephritis)', 'var(--belize-hole)', 'var(--wisteria)', 'var(--midnight-blue)', 'var(--sunflower)', 'var(--carrot)',
    'var(--alizarin)', 'var(--clouds)', 'var(--concrete)', 'var(--orange)', 'var(--pumpkin)', 'var(--pomegranate)',
    'var(--silver)', 'var(--asbestos)'
];

/* Available Material icons */
const toolIcons = [
    'dashboard', 'analytics', 'build', 'code', 'info', 'settings',
    'pie_chart', 'bar_chart', 'data_usage', 'schedule', 'notifications', 'mail',
    'chat', 'people', 'groups', 'folder', 'cloud', 'security',
    'search', 'help', 'important_devices', 'network_check', 'description', 'fact_check',
    'insights', 'integration_instructions', 'memory', 'pageview', 'storage', 'supervisor_account',
    'task', 'api', 'cable', 'query_stats', 'devices', 'app_settings_alt'
];

/* Global variables */
let sortableInstance = null;
let orderChanged = false;
let isAdminMode = false;
const adminPassword = "admin123";
let currentToolId = null;
let changesNeedSaving = false;

/* Iframe resizing support */
function resizeForIframe() {
    if (window.self !== window.top) {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ type: 'resize', height }, '*');
    }
}

/* Debug logging */
const debugLog = [];
function debug(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = {
        timestamp,
        message,
        data
    };
    debugLog.push(logEntry);
    
    // Update debug panel if it's open
    if (document.getElementById('debugPanel').classList.contains('show')) {
        updateDebugPanel();
    }
    
    // Also log to console
    if (data) {
        console.log(`[${timestamp}] ${message}`, data);
    } else {
        console.log(`[${timestamp}] ${message}`);
    }
}

function updateDebugPanel() {
    const panel = document.getElementById('debugPanel');
    panel.innerHTML = '';
    
    // Get last 50 entries maximum
    const entries = debugLog.slice(-50);
    
    entries.forEach(entry => {
        const logLine = document.createElement('div');
        logLine.style.marginBottom = '5px';
        logLine.style.borderBottom = '1px solid #eee';
        logLine.style.paddingBottom = '5px';
        
        const timestamp = document.createElement('span');
        timestamp.style.color = '#666';
        timestamp.textContent = `[${entry.timestamp}] `;
        
        const message = document.createElement('span');
        message.textContent = entry.message;
        
        logLine.appendChild(timestamp);
        logLine.appendChild(message);
        
        if (entry.data) {
            const dataDiv = document.createElement('div');
            dataDiv.style.marginTop = '3px';
            dataDiv.style.marginLeft = '20px';
            dataDiv.style.color = '#0066cc';
            dataDiv.style.fontSize = '11px';
            dataDiv.style.whiteSpace = 'pre-wrap';
            dataDiv.style.wordBreak = 'break-all';
            
            try {
                if (typeof entry.data === 'object') {
                    dataDiv.textContent = JSON.stringify(entry.data, null, 2);
                } else {
                    dataDiv.textContent = String(entry.data);
                }
            } catch (e) {
                dataDiv.textContent = '[Error displaying data]';
            }
            
            logLine.appendChild(dataDiv);
        }
        
        panel.appendChild(logLine);
    });
    
    // Auto-scroll to bottom
    panel.scrollTop = panel.scrollHeight;
}

/* Authentication token management */
function generateAuthToken() {
    // Generate a simple random token
    const randomToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    // Set expiration to 7 days from now
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    
    return {
        token: randomToken,
        expires: expirationDate.getTime()
    };
}

function saveAuthToken(authToken) {
    try {
        localStorage.setItem('authToken', JSON.stringify(authToken));
        debug('Auth token saved', { expires: new Date(authToken.expires).toLocaleString() });
    } catch (e) {
        debug('localStorage not available for saving auth token', e);
    }
}

function getAuthToken() {
    try {
        const tokenData = localStorage.getItem('authToken');
        if (tokenData) {
            return JSON.parse(tokenData);
        }
    } catch (e) {
        debug('Error getting auth token', e);
    }
    return null;
}

function clearAuthToken() {
    try {
        localStorage.removeItem('authToken');
        debug('Auth token cleared');
    } catch (e) {
        debug('Error clearing auth token', e);
    }
}

function checkAuthToken() {
    const tokenData = getAuthToken();
    debug('Checking auth token', tokenData);
    
    if (tokenData) {
        const now = new Date().getTime();
        if (now < tokenData.expires) {
            debug('Valid auth token found', { 
                expiresIn: Math.round((tokenData.expires - now) / (1000 * 60 * 60 * 24)) + ' days',
                expires: new Date(tokenData.expires).toLocaleString()
            });
            return true;
        } else {
            debug('Auth token expired', {
                now: new Date(now).toLocaleString(),
                tokenExpires: new Date(tokenData.expires).toLocaleString()
            });
            clearAuthToken();
        }
    } else {
        debug('No auth token found');
    }
    return false;
}

/* Initialize default tools */
function initializeDefaultTools() {
    debug('Initializing default tools');
    toolsData = [];
    for (let i = 0; i < 36; i++) {
        const colorIndex = i % toolColors.length;
        const iconIndex = i % toolIcons.length;
        toolsData.push({
            id: i + 1,
            icon: toolIcons[iconIndex],
            title: `Tool ${i+1}`,
            description: `This is a description for Tool ${i+1}. It explains what this tool does and how to use it.`,
            url: '#',
            color: toolColors[colorIndex]
        });
    }
}

/* Render dashboard with current tools data */
function renderDashboard() {
    debug('Rendering dashboard');
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';
    
    // Create a temporary array for reordering
    const reorderedTools = toolsData.slice(); // Create a copy to work with
    
    // Now use reorderedTools instead of toolsData for rendering
    reorderedTools.forEach((tool) => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.setAttribute('data-tool-id', tool.id);
        
        const colorBand = document.createElement('div');
        colorBand.className = 'card-color-band';
        colorBand.style.backgroundColor = tool.color;
        
        const content = document.createElement('div');
        content.className = 'tool-content';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'tool-icon';
        iconDiv.style.backgroundColor = tool.color;
        
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = tool.icon;
        iconDiv.appendChild(icon);
        
        const info = document.createElement('div');
        info.className = 'tool-info';
        
        const title = document.createElement('h3');
        title.className = 'tool-title';
        title.textContent = tool.title;
        
        const description = document.createElement('p');
        description.className = 'tool-description';
        description.textContent = tool.description;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = `Click to open ${tool.title}`;
        
        const editButton = document.createElement('div');
        editButton.className = 'edit-button';
        editButton.innerHTML = '<span class="material-icons" style="font-size: 16px;">edit</span>';
        editButton.addEventListener('click', function(e) {
            e.stopPropagation();
            openEditPanel(tool.id);
        });
        
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<span class="material-icons">drag_indicator</span>';
        
        info.appendChild(title);
        info.appendChild(description);
        content.appendChild(iconDiv);
        content.appendChild(info);
        card.appendChild(colorBand);
        card.appendChild(content);
        card.appendChild(tooltip);
        card.appendChild(editButton);
        card.appendChild(dragHandle);
        
        dashboard.appendChild(card);
        
        card.addEventListener('click', function() {
            if (!document.body.classList.contains('admin-mode')) {
                this.classList.add('pulse');
                if (tool.url && tool.url !== '#') {
                    window.open(tool.url, '_blank');
                }
                setTimeout(() => {
                    this.classList.remove('pulse');
                }, 1500);
            }
        });
    });

    if (document.body.classList.contains('admin-mode')) {
        document.querySelectorAll('.tool-card').forEach(card => {
            card.classList.add('admin-mode');
        });
        initDragAndDrop();
    } else if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
}

/* Initialize drag and drop functionality */
function initDragAndDrop() {
    debug('Initializing drag and drop');
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    
    const dashboard = document.getElementById('dashboard');
    
    sortableInstance = new Sortable(dashboard, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        handle: '.drag-handle',
        onEnd: function(evt) {
            updateToolsDataOrder();
            orderChanged = true;
            changesNeedSaving = true;
            
            // Update the Save Changes button to show changes need saving
            updateSaveChangesButton();
        }
    });
}

/* Update toolsData array after drag and drop reordering */
function updateToolsDataOrder() {
    debug('Updating tools order');
    const dashboard = document.getElementById('dashboard');
    const cards = dashboard.querySelectorAll('.tool-card');
    const newToolsData = [];
    
    cards.forEach(card => {
        const toolId = parseInt(card.getAttribute('data-tool-id'));
        const tool = toolsData.find(t => t.id === toolId);
        if (tool) {
            newToolsData.push(tool);
        }
    });
    
    toolsData = newToolsData;
}

/* Update the Save Changes button to show changes need saving */
function updateSaveChangesButton() {
    const saveBtn = document.getElementById('saveAllChangesBtn');
    if (changesNeedSaving || orderChanged) {
        if (!saveBtn.classList.contains('has-changes')) {
            saveBtn.classList.add('has-changes');
            saveBtn.innerHTML = '<span class="material-icons">save</span>Save Changes*';
        }
    } else {
        saveBtn.classList.remove('has-changes');
        saveBtn.innerHTML = '<span class="material-icons">save</span>Save All Changes';
    }
}

/* GitHub API - Fetch configuration */
async function fetchConfigFromGitHub() {
    debug('Fetching config from GitHub', { username: githubSettings.username, repo: githubSettings.repo });
    
    if (!githubSettings.username || !githubSettings.repo) {
        debug('GitHub settings incomplete');
        showStatusMessage('GitHub settings not configured', 'error');
        return null;
    }

    try {
        // For admin mode (with token), use the GitHub API
        if (githubSettings.token) {
            const url = `https://api.github.com/repos/${githubSettings.username}/${githubSettings.repo}/contents/dashboard-config.json?ref=${githubSettings.branch}`;
            debug('GitHub API URL', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${githubSettings.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                debug('Config file not found on GitHub');
                return null;
            }

            if (!response.ok) {
                const errorText = await response.text();
                debug('GitHub API error', { status: response.status, statusText: response.statusText, errorText });
                throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            debug('GitHub API response', { sha: data.sha });
            
            // Safely decode base64 content
            let content;
            try {
                content = atob(data.content.replace(/\s/g, ''));
            } catch (e) {
                debug('Base64 decode error', e);
                throw new Error(`Failed to decode content: ${e.message}`);
            }
            
            // Safely parse JSON
            let config;
            try {
                config = JSON.parse(content);
            } catch (e) {
                debug('JSON parse error', e);
                throw new Error(`Failed to parse JSON: ${e.message}`);
            }
            
            return {
                toolsData: config.toolsData,
                sha: data.sha
            };
        } 
        // For non-admin mode (no token), use raw GitHub content
        else {
            return await loadPublicConfigFromGitHub();
        }
    } catch (error) {
        debug('Error fetching config from GitHub', error);
        showStatusMessage(`GitHub error: ${error.message}`, 'error');
        return null;
    }
}

/* GitHub API - Save configuration */
async function saveConfigToGitHub() {
    debug('Saving config to GitHub', { username: githubSettings.username, repo: githubSettings.repo });
    
    if (!githubSettings.username || !githubSettings.repo || !githubSettings.token) {
        debug('GitHub settings incomplete');
        showStatusMessage('GitHub settings not configured', 'error');
        return false;
    }
    
    // Reset change flags
    changesNeedSaving = false;
    orderChanged = false;

    try {
        // Prepare the content
        const configContent = JSON.stringify({ toolsData: toolsData }, null, 2);
        debug('Config content length', configContent.length);
        
        // Safely encode content to base64
        let encodedContent;
        try {
            // Use safer encoding function that handles UTF-8 properly
            encodedContent = btoa(unescape(encodeURIComponent(configContent)));
        } catch (e) {
            debug('Base64 encode error', e);
            throw new Error(`Failed to encode content: ${e.message}`);
        }

        // Check if the file already exists to get its SHA
        let sha = null;
        try {
            const checkUrl = `https://api.github.com/repos/${githubSettings.username}/${githubSettings.repo}/contents/dashboard-config.json?ref=${githubSettings.branch}`;
            debug('Checking existing file', checkUrl);
            
            const checkResponse = await fetch(checkUrl, {
                headers: {
                    'Authorization': `token ${githubSettings.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (checkResponse.ok) {
                const fileData = await checkResponse.json();
                sha = fileData.sha;
                debug('Found existing file', { sha });
            } else if (checkResponse.status !== 404) {
                const errorText = await checkResponse.text();
                debug('GitHub API error checking file', { 
                    status: checkResponse.status, 
                    statusText: checkResponse.statusText,
                    error: errorText
                });
            }
        } catch (e) {
            debug('Error checking existing file', e);
            // Continue without SHA if we couldn't get it
        }

        // Prepare the payload for GitHub API
        const url = `https://api.github.com/repos/${githubSettings.username}/${githubSettings.repo}/contents/dashboard-config.json`;
        debug('GitHub API URL for save', url);
        
        const payload = {
            message: 'Update dashboard configuration',
            content: encodedContent,
            branch: githubSettings.branch
        };

        if (sha) {
            payload.sha = sha;
        }
        
        debug('GitHub API payload', { messageLength: payload.message.length, contentLength: encodedContent.length, sha: payload.sha });

        // Make the API request
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubSettings.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(payload)
        });

        // Handle the response
        if (!response.ok) {
            const errorText = await response.text();
            debug('GitHub API error saving', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`GitHub API error (${response.status}): ${errorText}`);
        }

        const responseData = await response.json();
        debug('GitHub save successful', { commit: responseData.commit });
        
        showStatusMessage('Configuration saved to GitHub successfully', 'success');
        
        // Update the save button to show no changes pending
        updateSaveChangesButton();
        
        return true;
    } catch (error) {
        debug('Error saving config to GitHub', error);
        showStatusMessage(`GitHub save error: ${error.message}`, 'error');
        return false;
    }
}

/* GitHub API - Test connection */
async function testGitHubConnection() {
    const testUsername = document.getElementById('githubUsername').value;
    const testRepo = document.getElementById('githubRepo').value;
    const testToken = document.getElementById('githubToken').value;
    const testBranch = document.getElementById('githubBranch').value || 'main';

    if (!testUsername || !testRepo || !testToken) {
        showStatusMessage('Please fill in all GitHub settings', 'error');
        return false;
    }

    debug('Testing GitHub connection', { username: testUsername, repo: testRepo, branch: testBranch });

    try {
        const url = `https://api.github.com/repos/${testUsername}/${testRepo}`;
        debug('GitHub API URL for test', url);
        
        const button = document.getElementById('testGithubConnection');
        button.innerHTML = '<span class="loading-spinner"></span>Testing...';
        button.disabled = true;

        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${testToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        button.textContent = 'Test Connection';
        button.disabled = false;

        if (!response.ok) {
            const errorText = await response.text();
            debug('GitHub API test error', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        debug('GitHub connection test successful', { repoName: data.name });
        
        showStatusMessage('GitHub connection successful!', 'success');
        return true;
    } catch (error) {
        debug('Error testing GitHub connection', error);
        showStatusMessage(`GitHub connection failed: ${error.message}`, 'error');
        return false;
    }
}

/* Save GitHub settings */
function saveGitHubSettings() {
    const username = document.getElementById('githubUsername').value;
    const repo = document.getElementById('githubRepo').value;
    const token = document.getElementById('githubToken').value;
    const branch = document.getElementById('githubBranch').value || 'main';

    if (!username || !repo || !token) {
        showStatusMessage('Please fill in all GitHub settings', 'error');
        return;
    }

    debug('Saving GitHub settings', { username, repo, branch });
    
    githubSettings = { username, repo, token, branch };

    try {
        localStorage.setItem('githubUsername', username);
        localStorage.setItem('githubRepo', repo);
        localStorage.setItem('githubToken', token);
        localStorage.setItem('githubBranch', branch);
        debug('GitHub settings saved to localStorage');
        
        showStatusMessage('GitHub settings saved successfully', 'success');
        document.getElementById('githubTokenPanel').style.display = 'none';
        loadConfigFromGitHub();
        enterAdminMode();
    } catch (e) {
        debug('localStorage not available', e);
        showStatusMessage('GitHub settings saved for this session', 'success');
        document.getElementById('githubTokenPanel').style.display = 'none';
        loadConfigFromGitHub();
        enterAdminMode();
    }
}

/* Load config from GitHub */
async function loadConfigFromGitHub() {
    debug('Loading config from GitHub');
    
    const button = document.getElementById('saveGithubSettings');
    if (button) {
        button.innerHTML = '<span class="loading-spinner"></span>Loading...';
        button.disabled = true;
    }

    const config = await fetchConfigFromGitHub();
    
    if (button) {
        button.textContent = 'Save Settings';
        button.disabled = false;
    }
    
    if (config && config.toolsData) {
        debug('Config loaded from GitHub', { toolCount: config.toolsData.length });
        toolsData = config.toolsData;
        renderDashboard();
        showStatusMessage('Configuration loaded from GitHub', 'success');
    } else if (config === null) {
        debug('No config found, saving current config');
        saveConfigToGitHub();
    }
}

/* Load public config from GitHub */
async function loadPublicConfigFromGitHub() {
    if (!githubSettings.username || !githubSettings.repo) {
        debug('GitHub settings incomplete for public load');
        return null;
    }
    
    debug('Loading public config from GitHub');
    
    try {
        const url = `https://raw.githubusercontent.com/${githubSettings.username}/${githubSettings.repo}/${githubSettings.branch}/dashboard-config.json`;
        debug('GitHub raw content URL', url);
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            debug('Config file not found on GitHub (public)');
            return null;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            debug('GitHub raw content error', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`GitHub request error: ${response.status} - ${errorText}`);
        }
        
        const config = await response.json();
        debug('Public config loaded successfully', { toolCount: config.toolsData.length });
        return config;
    } catch (error) {
        debug('Error loading public config from GitHub', error);
        return null;
    }
}

/* Admin mode functions */
function enterAdminMode() {
    debug('Entering admin mode');
    isAdminMode = true;
    document.body.classList.add('admin-mode');
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.add('admin-mode');
    });
    
    // Show admin controls in the toolbar
    document.getElementById('adminLoginLink').style.display = 'none';
    document.getElementById('adminControls').style.display = 'flex';
    
    initDragAndDrop();
}

function exitAdminMode() {
    debug('Exiting admin mode');
    
    // Save changes to GitHub when exiting admin mode if there are any pending changes
    if ((changesNeedSaving || orderChanged) && githubSettings.token) {
        // Show saving status
        showStatusMessage('Saving all changes to GitHub...', 'success');
        
        // Save to GitHub
        saveConfigToGitHub().then(() => {
            // Reset changes flags
            changesNeedSaving = false;
            orderChanged = false;
            showStatusMessage('All changes saved to GitHub successfully', 'success');
        }).catch(error => {
            debug('Error saving to GitHub on exit', error);
            showStatusMessage('Error saving changes to GitHub. Your changes are saved locally.', 'error');
        });
    }
    
    // Update UI for non-admin mode
    isAdminMode = false;
    document.body.classList.remove('admin-mode');
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('admin-mode');
    });
    document.getElementById('adminPanel').style.display = 'none';
    
    // Hide admin controls in the toolbar
    document.getElementById('adminLoginLink').style.display = 'inline-block';
    document.getElementById('adminControls').style.display = 'none';
    
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
}

function openEditPanel(toolId) {
    currentToolId = toolId;
    
    if (toolId === null) {
        debug('Opening panel to add new tool');
        document.getElementById('adminPanelTitle').textContent = 'Add New Tool';
        document.getElementById('toolIcon').value = 'dashboard';
        document.getElementById('toolTitle').value = '';
        document.getElementById('toolDescription').value = '';
        document.getElementById('toolLink').value = '';
        document.getElementById('deleteTool').style.display = 'none';
        setupColorPicker('var(--turquoise)');
    } else {
        debug('Opening panel to edit tool', { toolId });
        const tool = toolsData.find(t => t.id === toolId);
        document.getElementById('adminPanelTitle').textContent = 'Edit Tool';
        document.getElementById('toolIcon').value = tool.icon;
        document.getElementById('toolTitle').value = tool.title;
        document.getElementById('toolDescription').value = tool.description;
        document.getElementById('toolLink').value = tool.url;
        document.getElementById('deleteTool').style.display = 'inline-block';
        setupColorPicker(tool.color);
    }
    
    document.querySelector('.icon-preview .material-icons').textContent = document.getElementById('toolIcon').value;
    document.getElementById('adminPanel').style.display = 'block';
}

function setupColorPicker(selectedColor) {
    debug('Setting up color picker', { selectedColor });
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.innerHTML = '';
    
    const colorMap = {
        'turquoise': 'var(--turquoise)',
        'emerald': 'var(--emerald)',
        'peter-river': 'var(--peter-river)',
        'amethyst': 'var(--amethyst)',
        'wet-asphalt': 'var(--wet-asphalt)',
        'green-sea': 'var(--green-sea)',
        'nephritis': 'var(--nephritis)',
        'belize-hole': 'var(--belize-hole)',
        'wisteria': 'var(--wisteria)',
        'midnight-blue': 'var(--midnight-blue)',
        'sunflower': 'var(--sunflower)',
        'carrot': 'var(--carrot)',
        'alizarin': 'var(--alizarin)',
        'clouds': 'var(--clouds)',
        'concrete': 'var(--concrete)',
        'orange': 'var(--orange)',
        'pumpkin': 'var(--pumpkin)',
        'pomegranate': 'var(--pomegranate)',
        'silver': 'var(--silver)',
        'asbestos': 'var(--asbestos)'
    };
    
    Object.entries(colorMap).forEach(([name, value]) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.setAttribute('data-color-value', value);
        swatch.style.backgroundColor = value;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'color-swatch-name';
        nameSpan.textContent = name.replace(/-/g, ' ');
        swatch.appendChild(nameSpan);
        
        if (value === selectedColor) {
            swatch.classList.add('selected');
        }
        
        swatch.addEventListener('click', function() {
            document.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.remove('selected');
            });
            this.classList.add('selected');
        });
        
        colorPicker.appendChild(swatch);
    });
}

/* Status message */
function showStatusMessage(message, type) {
    debug('Showing status message', { message, type });
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = 'status-message ' + type;
    statusElement.classList.add('show');
    
    setTimeout(() => {
        statusElement.classList.remove('show');
    }, 5000); // Increased from 3000 to 5000 for more visibility
}

/* Load settings from localStorage */
function loadSettings() {
    debug('Loading settings');
    try {
        const username = localStorage.getItem('githubUsername') || 'adamismyusername';
        const repo = localStorage.getItem('githubRepo') || 'sfdash';
        const token = localStorage.getItem('githubToken') || '';
        const branch = localStorage.getItem('githubBranch') || 'main';
        
        debug('Settings loaded from localStorage', { username, repo, branch, hasToken: !!token });
        
        githubSettings = { username, repo, token, branch };
        document.getElementById('githubUsername').value = username;
        document.getElementById('githubRepo').value = repo;
        document.getElementById('githubToken').value = token;
        document.getElementById('githubBranch').value = branch;
        
        const savedTools = localStorage.getItem('dashboardTools');
        if (savedTools) {
            try {
                toolsData = JSON.parse(savedTools);
                debug('Tools loaded from localStorage', { toolCount: toolsData.length });
            } catch (e) {
                debug('Error parsing saved tools data', e);
                initializeDefaultTools();
            }
        } else {
            debug('No saved tools in localStorage');
            initializeDefaultTools();
        }
    } catch (e) {
        debug('localStorage not available', e);
        githubSettings = { 
            username: 'adamismyusername', 
            repo: 'sfdash', 
            token: '', 
            branch: 'main' 
        };
        document.getElementById('githubUsername').value = githubSettings.username;
        document.getElementById('githubRepo').value = githubSettings.repo;
        document.getElementById('githubBranch').value = githubSettings.branch;
        initializeDefaultTools();
    }
}

/* Try to infer GitHub settings from URL */
function tryInferGitHubSettings() {
    debug('Trying to infer GitHub settings from URL');
    try {
        const url = new URL(window.location.href);
        debug('Current URL', url.toString());
        
        const pathParts = url.pathname.split('/').filter(part => part);
        debug('Path parts', pathParts);
        
        if (url.hostname.endsWith('github.io')) {
            const username = url.hostname.replace('.github.io', '');
            const repo = pathParts[0] || '';
            
            if (username && repo) {
                debug('Inferred GitHub settings', { username, repo });
                githubSettings.username = username;
                githubSettings.repo = repo;
                document.getElementById('githubUsername').value = username;
                document.getElementById('githubRepo').value = repo;
            } else {
                debug('Could not fully infer GitHub settings', { username, repo });
            }
        }
    } catch (e) {
        debug('Error inferring GitHub settings from URL', e);
    }
}

/* Event listeners setup */
function setupEventListeners() {
    debug('Setting up event listeners');
    
    // Admin login link
    document.getElementById('adminLoginLink').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('adminLoginPanel').style.display = 'block';
    });
    
    // Debug panel toggle
    document.getElementById('debugToggle').addEventListener('click', function() {
        const panel = document.getElementById('debugPanel');
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) {
            updateDebugPanel();
        }
    });
    
    // Cancel login
    document.getElementById('cancelLogin').addEventListener('click', function() {
        document.getElementById('adminLoginPanel').style.display = 'none';
    });
    
    // Login as admin
    document.getElementById('loginAdmin').addEventListener('click', function() {
        const password = document.getElementById('adminPassword').value;
        if (password === adminPassword) {
            document.getElementById('adminLoginPanel').style.display = 'none';
            
            // Save authentication token if "Remember Me" is checked
            const rememberMe = document.getElementById('rememberMe').checked;
            debug('Remember me checked:', rememberMe);
            
            if (rememberMe) {
                const authToken = generateAuthToken();
                saveAuthToken(authToken);
                debug('User authenticated with "Remember Me"', authToken);
            }
            
            if (!githubSettings.token) {
                document.getElementById('githubTokenPanel').style.display = 'block';
            } else {
                enterAdminMode();
            }
            document.getElementById('adminPassword').value = '';
        } else {
            showStatusMessage('Incorrect password', 'error');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        exitAdminMode();
    });
    
    // New tool button
    document.getElementById('newToolBtn').addEventListener('click', function() {
        openEditPanel(null);
    });
    
    // Save all changes button
    document.getElementById('saveAllChangesBtn').addEventListener('click', async function() {
        if (changesNeedSaving || orderChanged) {
            // Show saving status
            const button = document.getElementById('saveAllChangesBtn');
            button.disabled = true;
            button.classList.add('saving');
            button.innerHTML = '<span class="loading-spinner"></span>Saving...';
            
            await saveConfigToGitHub();
            
            // Reset button
            setTimeout(() => {
                button.disabled = false;
                button.classList.remove('saving');
                button.innerHTML = '<span class="material-icons">save</span>Save All Changes';
            }, 1000);
        } else {
            showStatusMessage('No changes to save', 'success');
        }
    });
    
    // Close admin panel
    document.getElementById('closeAdmin').addEventListener('click', function() {
        document.getElementById('adminPanel').style.display = 'none';
    });
    
    // Close GitHub panel
    document.getElementById('closeGithubPanel').addEventListener('click', function() {
        document.getElementById('githubTokenPanel').style.display = 'none';
        if (githubSettings.token) {
            enterAdminMode();
        }
    });
    
    // Icon preview
    document.getElementById('toolIcon').addEventListener('input', function() {
        const previewIcon = document.querySelector('.icon-preview .material-icons');
        previewIcon.textContent = this.value || 'dashboard';
    });
    
    // Save tool changes
    document.getElementById('saveToolChanges').addEventListener('click', function() {
        debug('Saving tool changes');
        
        const selectedSwatch = document.querySelector('.color-swatch.selected');
        const selectedColor = selectedSwatch ? selectedSwatch.getAttribute('data-color-value') : 'var(--turquoise)';
        
        if (currentToolId === null) {
            // Add new tool
            const newId = toolsData.length > 0 ? Math.max(...toolsData.map(t => t.id)) + 1 : 1;
            const newTool = {
                id: newId,
                icon: document.getElementById('toolIcon').value,
                title: document.getElementById('toolTitle').value,
                description: document.getElementById('toolDescription').value,
                url: document.getElementById('toolLink').value,
                color: selectedColor
            };
            debug('Adding new tool', newTool);
            toolsData.push(newTool);
            changesNeedSaving = true;
        } else {
            // Update existing tool
            const toolIndex = toolsData.findIndex(t => t.id === currentToolId);
            if (toolIndex !== -1) {
                debug('Updating existing tool', { id: currentToolId });
                toolsData[toolIndex].icon = document.getElementById('toolIcon').value;
                toolsData[toolIndex].title = document.getElementById('toolTitle').value;
                toolsData[toolIndex].description = document.getElementById('toolDescription').value;
                toolsData[toolIndex].url = document.getElementById('toolLink').value;
                toolsData[toolIndex].color = selectedColor;
                changesNeedSaving = true;
            }
        }
        
        renderDashboard();
        
        // Save to localStorage for immediate persistence
        try {
            localStorage.setItem('dashboardTools', JSON.stringify(toolsData));
            debug('Saved tools to localStorage');
        } catch (e) {
            debug('localStorage not available for saving tools', e);
        }
        
        // Update the Save Changes button
        updateSaveChangesButton();
        
        document.getElementById('adminPanel').style.display = 'none';
    });
    
    // Delete tool
    document.getElementById('deleteTool').addEventListener('click', function() {
        if (currentToolId && confirm('Are you sure you want to delete this tool?')) {
            debug('Deleting tool', { id: currentToolId });
            toolsData = toolsData.filter(t => t.id !== currentToolId);
            renderDashboard();
            changesNeedSaving = true;
            
            // Save to localStorage for immediate persistence
            try {
                localStorage.setItem('dashboardTools', JSON.stringify(toolsData));
                debug('Saved tools to localStorage after delete');
            } catch (e) {
                debug('localStorage not available for saving after delete', e);
            }
            
            // Update the Save Changes button
            updateSaveChangesButton();
            
            document.getElementById('adminPanel').style.display = 'none';
        }
    });
    
    // Test GitHub connection
    document.getElementById('testGithubConnection').addEventListener('click', function() {
        testGitHubConnection();
    });
    
    // Save GitHub settings
    document.getElementById('saveGithubSettings').addEventListener('click', function() {
        saveGitHubSettings();
    });
    
    // Enter key in password field
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginAdmin').click();
        }
    });
    
    // Enter key in token field
    document.getElementById('githubToken').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('saveGithubSettings').click();
        }
    });
}

/* Initialize everything */
window.addEventListener('DOMContentLoaded', async function() {
    debug('DOM content loaded, initializing application');
    
    // Set default GitHub settings
    githubSettings = {
        username: 'adamismyusername',
        repo: 'sfdash',
        token: '',
        branch: 'main'
    };
    
    document.getElementById('githubUsername').value = githubSettings.username;
    document.getElementById('githubRepo').value = githubSettings.repo;
    document.getElementById('githubBranch').value = githubSettings.branch;
    
    // Try to load token from localStorage
    try {
        const token = localStorage.getItem('githubToken');
        if (token) {
            debug('Token loaded from localStorage');
            githubSettings.token = token;
            document.getElementById('githubToken').value = token;
        }
    } catch (e) {
        debug('localStorage not available for token', e);
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize default tools
    initializeDefaultTools();
    
    // Try to load config from GitHub
    let config = null;
    
    try {
        if (githubSettings.token) {
            debug('Loading config using token');
            try {
                config = await fetchConfigFromGitHub();
            } catch (e) {
                debug('Error loading config with token', e);
            }
        }
        
        if (!config) {
            debug('Loading public config');
            try {
                config = await loadPublicConfigFromGitHub();
            } catch (e) {
                debug('Error loading public config', e);
            }
        }
        
        if (config && config.toolsData) {
            debug('Config loaded', { toolCount: config.toolsData.length });
            toolsData = config.toolsData;
            try {
                localStorage.setItem('dashboardTools', JSON.stringify(toolsData));
            } catch (e) {
                debug('Could not save loaded tools to localStorage', e);
            }
        }
    } catch (e) {
        debug('Error during configuration loading', e);
        // If loading from GitHub fails, try loading from localStorage
        loadSettings();
    }
    
    // Check for saved authentication token
    const hasValidToken = checkAuthToken();
    debug('Auto-login check result:', hasValidToken);
    if (hasValidToken) {
        debug('Auto-login with saved token');
        if (githubSettings.token) {
            debug('Token exists, entering admin mode directly');
            enterAdminMode();
        } else {
            debug('No GitHub token, showing GitHub panel');
            document.getElementById('githubTokenPanel').style.display = 'block';
        }
    } 
    
    // Render the dashboard
    renderDashboard();
    
    debug('Initialization complete');
});

window.addEventListener('resize', resizeForIframe);
window.addEventListener('load', resizeForIframe);
setInterval(resizeForIframe, 500);
