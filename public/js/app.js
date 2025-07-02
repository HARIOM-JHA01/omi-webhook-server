document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const webhookData = document.getElementById('webhook-data');
    const clearBtn = document.getElementById('clear-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const datePicker = document.getElementById('date-picker');
    const hourSelect = document.getElementById('hour-select');
    const sessionInput = document.getElementById('session-input');
    const clearSessionBtn = document.getElementById('clear-session');
    const searchInput = document.getElementById('search-input');
    const cardViewBtn = document.getElementById('card-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const connectionIndicator = document.getElementById('connection-indicator');
    const connectionText = document.getElementById('connection-text');
    
    // Stats elements
    const totalCount = document.getElementById('total-count');
    const todayCount = document.getElementById('today-count');
    const hourCount = document.getElementById('hour-count');
    const userCount = document.getElementById('user-count');
    
    // State variables
    let allData = [];
    let today = new Date().toISOString().split('T')[0];
    let currentView = 'card'; // 'card' or 'list'
    let uniqueSessionIds = new Set();
    let uniqueUserIds = new Set();
    
    // Socket connection
    const socket = io();
    
    // Initialize flatpickr calendar
    const calendar = flatpickr(datePicker, {
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr) {
            updateHourOptions(dateStr);
            filterData();
        }
    });
    
    // Theme management
    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            themeToggleBtn.innerHTML = '<i class="bi bi-sun-fill"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="bi bi-moon-fill"></i>';
        }
    };
    
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }
    
    // Toggle theme
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
    
    // View toggle handlers
    cardViewBtn.addEventListener('click', () => {
        if (currentView !== 'card') {
            currentView = 'card';
            webhookData.className = 'card-view';
            cardViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            displayData(filterDataByAll());
        }
    });
    
    listViewBtn.addEventListener('click', () => {
        if (currentView !== 'list') {
            currentView = 'list';
            webhookData.className = 'list-view';
            listViewBtn.classList.add('active');
            cardViewBtn.classList.remove('active');
            displayData(filterDataByAll());
        }
    });
    
    // Format time for display (00:00.00)
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(2);
        return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remainingSeconds)).padStart(2, '0')}.${String(remainingSeconds).split('.')[1]}`;
    }
    
    // Update hour selection options based on selected date
    function updateHourOptions(selectedDate) {
        // Clear existing options except "All Hours"
        while (hourSelect.options.length > 1) {
            hourSelect.remove(1);
        }
        
        if (!selectedDate) return;
        
        // Find all available hours for the selected date
        const hours = allData
            .filter(item => item.timestamp.startsWith(selectedDate))
            .map(item => new Date(item.timestamp).getHours())
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort((a, b) => a - b);
        
        // Add hour options
        hours.forEach(hour => {
            const option = document.createElement('option');
            option.value = hour;
            option.textContent = `${hour}:00 - ${hour}:59`;
            hourSelect.appendChild(option);
        });
    }
    
    // Filter data by all criteria
    function filterDataByAll() {
        const selectedDate = datePicker.value;
        const selectedHour = hourSelect.value;
        const sessionId = sessionInput.value.trim().toLowerCase();
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        return allData.filter(data => {
            let matches = true;
            
            // Date filter
            if (selectedDate && !data.timestamp.startsWith(selectedDate)) {
                matches = false;
            }
            
            // Hour filter
            if (matches && selectedHour !== 'all') {
                const hour = parseInt(selectedHour);
                const dataHour = new Date(data.timestamp).getHours();
                if (dataHour !== hour) {
                    matches = false;
                }
            }
            
            // Session ID filter
            if (matches && sessionId) {
                const dataSessionId = 
                    (data.content?.body?.session_id || data.content?.query?.uid || '').toLowerCase();
                if (!dataSessionId.includes(sessionId)) {
                    matches = false;
                }
            }
            
            // Text search
            if (matches && searchTerm) {
                const segments = data.content?.body?.segments || [];
                const hasMatchingText = segments.some(segment => 
                    segment.text.toLowerCase().includes(searchTerm)
                );
                if (!hasMatchingText) {
                    matches = false;
                }
            }
            
            return matches;
        });
    }
    
    // Filter and display data
    function filterData() {
        const filteredData = filterDataByAll();
        displayData(filteredData);
    }
    
    // Update statistics
    function updateStats() {
        // Count total webhooks
        totalCount.textContent = allData.length;
        
        // Count today's webhooks
        const todaysData = allData.filter(item => 
            item.timestamp.startsWith(today));
        todayCount.textContent = todaysData.length;
        
        // Count last hour's webhooks
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const lastHourData = allData.filter(item => 
            new Date(item.timestamp) >= oneHourAgo);
        hourCount.textContent = lastHourData.length;
        
        // Count unique users/sessions
        userCount.textContent = uniqueSessionIds.size;
    }
    
    // Create webhook entry element
    function createWebhookEntry(data) {
        const entry = document.createElement('div');
        entry.className = 'webhook-entry';
        
        // Create header with timestamp and session ID
        const header = document.createElement('div');
        header.className = 'entry-header';
        
        // Format timestamp for display
        const timestamp = new Date(data.timestamp).toLocaleString();
        
        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        timestampEl.textContent = timestamp;
        
        const sessionBadge = document.createElement('div');
        sessionBadge.className = 'session-badge';
        
        // Extract session ID if available
        let sessionId = '';
        if (data.content?.body?.session_id) {
            sessionId = data.content.body.session_id;
            sessionBadge.textContent = `Session: ${sessionId}`;
        } else if (data.content?.query?.uid) {
            sessionId = data.content.query.uid;
            sessionBadge.textContent = `UID: ${sessionId}`;
        } else {
            sessionBadge.textContent = 'No Session ID';
        }
        
        // Track unique session IDs
        if (sessionId) {
            uniqueSessionIds.add(sessionId);
        }
        
        header.appendChild(timestampEl);
        header.appendChild(sessionBadge);
        
        // Create content section
        const content = document.createElement('div');
        content.className = 'entry-content';
        
        // Display segments if available
        if (data.content?.body?.segments && data.content.body.segments.length > 0) {
            const segments = document.createElement('div');
            segments.className = 'segments';
            
            data.content.body.segments.forEach(segment => {
                const segmentEl = document.createElement('div');
                segmentEl.className = segment.is_user ? 'segment user-segment' : 'segment';
                
                const segmentHeader = document.createElement('div');
                segmentHeader.className = 'segment-header';
                
                const speaker = document.createElement('div');
                speaker.className = 'speaker';
                speaker.textContent = segment.speaker || 'Unknown Speaker';
                
                const timing = document.createElement('div');
                timing.className = 'segment-time';
                timing.textContent = `${formatTime(segment.start)} - ${formatTime(segment.end)}`;
                
                segmentHeader.appendChild(speaker);
                segmentHeader.appendChild(timing);
                
                const text = document.createElement('div');
                text.className = 'segment-text';
                text.textContent = segment.text;
                
                segmentEl.appendChild(segmentHeader);
                segmentEl.appendChild(text);
                segments.appendChild(segmentEl);
            });
            
            if (currentView === 'list') {
                // For list view, add metadata section
                const metaSection = document.createElement('div');
                metaSection.className = 'entry-meta';
                
                // Add speaker count
                const speakerItem = document.createElement('div');
                speakerItem.className = 'meta-item';
                
                const speakerLabel = document.createElement('div');
                speakerLabel.className = 'meta-label';
                speakerLabel.textContent = 'Speakers';
                
                const speakerCount = document.createElement('div');
                speakerCount.className = 'meta-value';
                
                // Count unique speakers
                const speakers = new Set(data.content.body.segments.map(s => s.speaker));
                speakerCount.textContent = speakers.size;
                
                speakerItem.appendChild(speakerLabel);
                speakerItem.appendChild(speakerCount);
                
                // Add segment count
                const segmentItem = document.createElement('div');
                segmentItem.className = 'meta-item';
                
                const segmentLabel = document.createElement('div');
                segmentLabel.className = 'meta-label';
                segmentLabel.textContent = 'Segments';
                
                const segmentCount = document.createElement('div');
                segmentCount.className = 'meta-value';
                segmentCount.textContent = data.content.body.segments.length;
                
                segmentItem.appendChild(segmentLabel);
                segmentItem.appendChild(segmentCount);
                
                // Add total duration
                const durationItem = document.createElement('div');
                durationItem.className = 'meta-item';
                
                const durationLabel = document.createElement('div');
                durationLabel.className = 'meta-label';
                durationLabel.textContent = 'Duration';
                
                const durationValue = document.createElement('div');
                durationValue.className = 'meta-value';
                
                // Calculate total duration
                const lastSegment = data.content.body.segments[data.content.body.segments.length - 1];
                durationValue.textContent = formatTime(lastSegment.end);
                
                durationItem.appendChild(durationLabel);
                durationItem.appendChild(durationValue);
                
                metaSection.appendChild(speakerItem);
                metaSection.appendChild(segmentItem);
                metaSection.appendChild(durationItem);
                
                content.appendChild(metaSection);
            }
            
            content.appendChild(segments);
        } else {
            const noSegments = document.createElement('div');
            noSegments.className = 'empty-segments';
            noSegments.textContent = 'No transcript segments in this webhook';
            content.appendChild(noSegments);
        }
        
        // Add JSON view toggle button
        const footer = document.createElement('div');
        footer.className = 'entry-footer';
        
        const jsonToggle = document.createElement('button');
        jsonToggle.className = 'show-raw-btn';
        jsonToggle.innerHTML = '<i class="bi bi-braces"></i> Show Raw JSON';
        
        const jsonViewer = document.createElement('div');
        jsonViewer.className = 'raw-json';
        
        const jsonPre = document.createElement('pre');
        jsonPre.textContent = JSON.stringify(data.content, null, 2);
        
        jsonViewer.appendChild(jsonPre);
        
        jsonToggle.addEventListener('click', () => {
            if (jsonViewer.style.display === 'none' || !jsonViewer.style.display) {
                jsonViewer.style.display = 'block';
                jsonToggle.innerHTML = '<i class="bi bi-braces"></i> Hide Raw JSON';
            } else {
                jsonViewer.style.display = 'none';
                jsonToggle.innerHTML = '<i class="bi bi-braces"></i> Show Raw JSON';
            }
        });
        
        content.appendChild(jsonViewer);
        footer.appendChild(jsonToggle);
        
        // Add elements to entry
        entry.appendChild(header);
        entry.appendChild(content);
        entry.appendChild(footer);
        
        return entry;
    }
    
    // Display webhook data
    function displayData(dataArray) {
        // Clear existing data
        webhookData.innerHTML = '';
        
        if (dataArray.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const emptyIcon = document.createElement('div');
            emptyIcon.className = 'empty-state-icon';
            emptyIcon.innerHTML = '<i class="bi bi-search"></i>';
            
            const emptyTitle = document.createElement('h3');
            emptyTitle.textContent = 'No matching webhooks found';
            
            const emptyText = document.createElement('p');
            emptyText.textContent = 'Try adjusting your filters or search criteria to see more results.';
            
            emptyState.appendChild(emptyIcon);
            emptyState.appendChild(emptyTitle);
            emptyState.appendChild(emptyText);
            
            webhookData.appendChild(emptyState);
            return;
        }
        
        // Sort by timestamp (newest first)
        dataArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(data => {
                const entry = createWebhookEntry(data);
                webhookData.appendChild(entry);
            });
    }
    
    // Clear the display
    clearBtn.addEventListener('click', () => {
        webhookData.innerHTML = `
            <div class="placeholder">
                <div class="placeholder-icon">
                    <i class="bi bi-arrow-down-circle"></i>
                </div>
                <h3>Waiting for webhook data...</h3>
                <p>Incoming Omi transcriptions will appear here in real-time</p>
            </div>
        `;
    });
    
    // Refresh data
    refreshBtn.addEventListener('click', () => {
        socket.emit('requestAllData');
    });
    
    // Clear session filter
    clearSessionBtn.addEventListener('click', () => {
        sessionInput.value = '';
        filterData();
    });
    
    // Filter handlers
    hourSelect.addEventListener('change', filterData);
    sessionInput.addEventListener('input', filterData);
    searchInput.addEventListener('input', filterData);
    
    // Socket connection status handling
    socket.on('connect', () => {
        connectionIndicator.className = 'status-indicator connected';
        connectionText.textContent = 'Connected';
    });
    
    socket.on('disconnect', () => {
        connectionIndicator.className = 'status-indicator disconnected';
        connectionText.textContent = 'Disconnected';
    });
    
    // Listen for available dates
    socket.on('availableDates', (dates) => {
        // If we have dates, set the calendar's enable dates
        if (dates && dates.length > 0) {
            calendar.set('enable', dates.map(date => date));
        }
    });
    
    // Display webhook data in real-time
    socket.on('webhookData', (data) => {
        // Add to our data array
        allData.unshift(data);
        
        // Track session ID if available
        if (data.content?.body?.session_id) {
            uniqueSessionIds.add(data.content.body.session_id);
        } else if (data.content?.query?.uid) {
            uniqueSessionIds.add(data.content.query.uid);
        }
        
        // Update statistics
        updateStats();
        
        // Check if the new data passes current filters
        const passesFilters = filterDataByAll().includes(data);
        
        if (passesFilters) {
            // Remove placeholder if present
            const placeholder = webhookData.querySelector('.placeholder');
            if (placeholder) {
                webhookData.removeChild(placeholder);
            }
            
            // Create and add the new entry
            const entry = createWebhookEntry(data);
            
            // Add entry to top of the list
            if (webhookData.firstChild) {
                webhookData.insertBefore(entry, webhookData.firstChild);
            } else {
                webhookData.appendChild(entry);
            }
        }
    });
    
    // Listen for historical data
    socket.on('historicalData', (dataArray) => {
        // Store all data
        allData = dataArray;
        
        // Extract unique session IDs
        dataArray.forEach(data => {
            if (data.content?.body?.session_id) {
                uniqueSessionIds.add(data.content.body.session_id);
            } else if (data.content?.query?.uid) {
                uniqueSessionIds.add(data.content.query.uid);
            }
        });
        
        // Update statistics
        updateStats();
        
        // Display the data
        displayData(filterDataByAll());
        
        // Update date picker with available dates
        const dates = [...new Set(dataArray.map(item => item.timestamp.split('T')[0]))];
        if (dates && dates.length > 0) {
            calendar.set('enable', dates);
        }
    });
    
    // Request initial data when page loads
    socket.emit('requestAvailableDates');
    socket.emit('requestAllData');
});