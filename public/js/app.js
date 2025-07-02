document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const webhookData = document.getElementById('webhook-data');
    const clearBtn = document.getElementById('clear-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const datePicker = document.getElementById('date-picker');
    const hourSelect = document.getElementById('hour-select');
    const connectionStatus = document.getElementById('connection-status');
    const totalCount = document.getElementById('total-count');
    const todayCount = document.getElementById('today-count');
    
    let allData = [];
    let today = new Date().toISOString().split('T')[0];
    
    // Initialize flatpickr calendar
    const calendar = flatpickr(datePicker, {
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr) {
            updateHourOptions(dateStr);
            filterData();
        }
    });
    
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
    
    // Filter data based on selected date and hour
    function filterData() {
        const selectedDate = datePicker.value;
        const selectedHour = hourSelect.value;
        
        let filteredData = allData;
        
        if (selectedDate) {
            filteredData = filteredData.filter(item => 
                item.timestamp.startsWith(selectedDate));
                
            if (selectedHour !== 'all') {
                const hour = parseInt(selectedHour);
                filteredData = filteredData.filter(item => 
                    new Date(item.timestamp).getHours() === hour);
            }
        }
        
        displayData(filteredData);
    }
    
    // Update statistics
    function updateStats() {
        // Update total count
        totalCount.textContent = allData.length;
        
        // Update today's count
        const todaysData = allData.filter(item => 
            item.timestamp.startsWith(today));
        todayCount.textContent = todaysData.length;
    }
    
    // Format time for display (00:00.00)
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(2);
        return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remainingSeconds)).padStart(2, '0')}.${String(remainingSeconds).split('.')[1]}`;
    }
    
    // Display webhook data
    function displayData(dataArray) {
        // Clear existing data
        webhookData.innerHTML = '';
        
        if (dataArray.length === 0) {
            webhookData.innerHTML = '<div class="placeholder"><i class="bi bi-search"></i><p>No data available for the selected filter</p></div>';
            return;
        }
        
        // Add each entry to the display (newest first)
        dataArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(data => {
                // Create entry element
                const entry = document.createElement('div');
                entry.className = 'webhook-entry';
                
                // Create header with timestamp and session ID
                const header = document.createElement('div');
                header.className = 'header';
                
                // Format timestamp for display
                const timestamp = new Date(data.timestamp).toLocaleString();
                
                const timestampEl = document.createElement('div');
                timestampEl.className = 'timestamp';
                timestampEl.textContent = timestamp;
                
                const sessionId = document.createElement('div');
                sessionId.className = 'session-id';
                
                // Extract session ID if available
                if (data.content && data.content.body && data.content.body.session_id) {
                    sessionId.textContent = `Session: ${data.content.body.session_id}`;
                } else if (data.content && data.content.query && data.content.query.uid) {
                    sessionId.textContent = `UID: ${data.content.query.uid}`;
                } else {
                    sessionId.textContent = 'No Session ID';
                }
                
                header.appendChild(timestampEl);
                header.appendChild(sessionId);
                
                // Create content section
                const content = document.createElement('div');
                content.className = 'content';
                
                // Display segments if available
                if (data.content && data.content.body && data.content.body.segments && data.content.body.segments.length > 0) {
                    const segments = document.createElement('div');
                    segments.className = 'segments';
                    
                    data.content.body.segments.forEach(segment => {
                        const segmentCard = document.createElement('div');
                        segmentCard.className = 'segment-card';
                        
                        const segmentHeader = document.createElement('div');
                        segmentHeader.className = 'segment-header';
                        
                        const speaker = document.createElement('div');
                        speaker.className = 'speaker';
                        speaker.textContent = segment.speaker || 'Unknown Speaker';
                        
                        const timing = document.createElement('div');
                        timing.className = 'timing';
                        timing.textContent = `${formatTime(segment.start)} - ${formatTime(segment.end)}`;
                        
                        segmentHeader.appendChild(speaker);
                        segmentHeader.appendChild(timing);
                        
                        const text = document.createElement('div');
                        text.className = 'text';
                        text.textContent = segment.text;
                        
                        segmentCard.appendChild(segmentHeader);
                        segmentCard.appendChild(text);
                        segments.appendChild(segmentCard);
                    });
                    
                    content.appendChild(segments);
                }
                
                // Add full JSON view toggle
                const jsonToggle = document.createElement('button');
                jsonToggle.className = 'json-viewer-toggle';
                jsonToggle.textContent = 'Show Raw JSON';
                
                const jsonViewer = document.createElement('div');
                jsonViewer.className = 'json-viewer';
                jsonViewer.style.display = 'none';
                
                const jsonPre = document.createElement('pre');
                jsonPre.textContent = JSON.stringify(data.content, null, 2);
                
                jsonViewer.appendChild(jsonPre);
                
                jsonToggle.addEventListener('click', () => {
                    if (jsonViewer.style.display === 'none') {
                        jsonViewer.style.display = 'block';
                        jsonToggle.textContent = 'Hide Raw JSON';
                    } else {
                        jsonViewer.style.display = 'none';
                        jsonToggle.textContent = 'Show Raw JSON';
                    }
                });
                
                content.appendChild(jsonToggle);
                content.appendChild(jsonViewer);
                
                // Add elements to entry
                entry.appendChild(header);
                entry.appendChild(content);
                
                // Add entry to the list
                webhookData.appendChild(entry);
            });
    }
    
    // Clear the display
    clearBtn.addEventListener('click', () => {
        webhookData.innerHTML = '<div class="placeholder"><i class="bi bi-arrow-down-circle-fill"></i><p>Waiting for webhook data...</p></div>';
    });
    
    // Refresh data
    refreshBtn.addEventListener('click', () => {
        socket.emit('requestAllData');
    });
    
    // Filter by hour
    hourSelect.addEventListener('change', filterData);
    
    // Socket connection status handling
    socket.on('connect', () => {
        connectionStatus.className = 'connected';
        connectionStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Connected';
    });
    
    socket.on('disconnect', () => {
        connectionStatus.className = 'disconnected';
        connectionStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Disconnected';
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
        
        // Update statistics
        updateStats();
        
        // If no filters are applied, show the new data
        if (!datePicker.value) {
            // Remove placeholder if present
            const placeholder = webhookData.querySelector('.placeholder');
            if (placeholder) {
                webhookData.removeChild(placeholder);
            }
            
            // Create entry element
            const entry = document.createElement('div');
            entry.className = 'webhook-entry';
            
            // Create header with timestamp and session ID
            const header = document.createElement('div');
            header.className = 'header';
            
            // Format timestamp for display
            const timestamp = new Date(data.timestamp).toLocaleString();
            
            const timestampEl = document.createElement('div');
            timestampEl.className = 'timestamp';
            timestampEl.textContent = timestamp;
            
            const sessionId = document.createElement('div');
            sessionId.className = 'session-id';
            
            // Extract session ID if available
            if (data.content && data.content.body && data.content.body.session_id) {
                sessionId.textContent = `Session: ${data.content.body.session_id}`;
            } else if (data.content && data.content.query && data.content.query.uid) {
                sessionId.textContent = `UID: ${data.content.query.uid}`;
            } else {
                sessionId.textContent = 'No Session ID';
            }
            
            header.appendChild(timestampEl);
            header.appendChild(sessionId);
            
            // Create content section
            const content = document.createElement('div');
            content.className = 'content';
            
            // Display segments if available
            if (data.content && data.content.body && data.content.body.segments && data.content.body.segments.length > 0) {
                const segments = document.createElement('div');
                segments.className = 'segments';
                
                data.content.body.segments.forEach(segment => {
                    const segmentCard = document.createElement('div');
                    segmentCard.className = 'segment-card';
                    
                    const segmentHeader = document.createElement('div');
                    segmentHeader.className = 'segment-header';
                    
                    const speaker = document.createElement('div');
                    speaker.className = 'speaker';
                    speaker.textContent = segment.speaker || 'Unknown Speaker';
                    
                    const timing = document.createElement('div');
                    timing.className = 'timing';
                    timing.textContent = `${formatTime(segment.start)} - ${formatTime(segment.end)}`;
                    
                    segmentHeader.appendChild(speaker);
                    segmentHeader.appendChild(timing);
                    
                    const text = document.createElement('div');
                    text.className = 'text';
                    text.textContent = segment.text;
                    
                    segmentCard.appendChild(segmentHeader);
                    segmentCard.appendChild(text);
                    segments.appendChild(segmentCard);
                });
                
                content.appendChild(segments);
            }
            
            // Add full JSON view toggle
            const jsonToggle = document.createElement('button');
            jsonToggle.className = 'json-viewer-toggle';
            jsonToggle.textContent = 'Show Raw JSON';
            
            const jsonViewer = document.createElement('div');
            jsonViewer.className = 'json-viewer';
            jsonViewer.style.display = 'none';
            
            const jsonPre = document.createElement('pre');
            jsonPre.textContent = JSON.stringify(data.content, null, 2);
            
            jsonViewer.appendChild(jsonPre);
            
            jsonToggle.addEventListener('click', () => {
                if (jsonViewer.style.display === 'none') {
                    jsonViewer.style.display = 'block';
                    jsonToggle.textContent = 'Hide Raw JSON';
                } else {
                    jsonViewer.style.display = 'none';
                    jsonToggle.textContent = 'Show Raw JSON';
                }
            });
            
            content.appendChild(jsonToggle);
            content.appendChild(jsonViewer);
            
            // Add elements to entry
            entry.appendChild(header);
            entry.appendChild(content);
            
            // Add entry to top of the list
            webhookData.insertBefore(entry, webhookData.firstChild);
        }
    });
    
    // Listen for historical data
    socket.on('historicalData', (dataArray) => {
        // Store all data
        allData = dataArray;
        
        // Update statistics
        updateStats();
        
        // Display the data
        displayData(dataArray);
        
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