import fetch from "node-fetch";
/**
 * This script tests the webhook endpoint by sending requests
 * that mimic real Omi AI webhook data.
 */

// Sample realistic Omi webhook data
const createOmiWebhookData = (index) => {
  // Generate a random session ID
  const sessionId = `session_${Math.random().toString(36).substring(2, 15)}`;
  const segmentId = `${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 14)}`;
  
  // Random start time between 0 and 3000 seconds
  const startTime = (Math.random() * 3000).toFixed(6);
  // End time is 1-10 seconds after start time
  const endTime = (parseFloat(startTime) + 1 + Math.random() * 9).toFixed(6);
  
  // Sample text phrases that might appear in transcriptions
  const phrases = [
    "Yeah. Bye. Thanks.",
    "I understand what you're saying.",
    "Could you explain that again please?",
    "That makes a lot of sense now.",
    "I'm not sure I follow your reasoning.",
    "Let me think about that for a moment.",
    "That's an interesting perspective.",
    "I hadn't considered that before.",
    "So what you're saying is...",
    "Can we discuss this further?",
    "I appreciate your input on this matter.",
    "Let's move on to the next topic.",
    "I'll need to get back to you on that.",
    "Is there anything else we should consider?",
    "That's all for today's meeting."
  ];
  
  // Select a random phrase
  const text = phrases[Math.floor(Math.random() * phrases.length)];
  
  // Determine if this is from user or not (random)
  const isUser = Math.random() > 0.5;
  
  // Create the webhook data object
  return {
    headers: {
      "host": "165.227.207.166:11000",
      "user-agent": "python-requests/2.32.3",
      "accept-encoding": "gzip, deflate",
      "accept": "*/*",
      "connection": "keep-alive",
      "content-length": "278",
      "content-type": "application/json",
      "x-datadog-trace-id": `${Math.floor(Math.random() * 10000000000000000000)}`,
      "x-datadog-parent-id": `${Math.floor(Math.random() * 10000000000000000000)}`,
      "x-datadog-sampling-priority": "1",
      "x-datadog-tags": `_dd.p.dm=-1,_dd.p.tid=${Math.random().toString(16).substring(2, 10)}00000000`
    },
    body: {
      "session_id": sessionId,
      "segments": [
        {
          "id": segmentId,
          "text": text,
          "speaker": isUser ? "SPEAKER_0" : "SPEAKER_1",
          "speaker_id": isUser ? 0 : 1,
          "is_user": isUser,
          "person_id": null,
          "start": parseFloat(startTime),
          "end": parseFloat(endTime),
          "translations": []
        }
      ]
    },
    params: {},
    query: {
      "uid": sessionId
    }
  };
};

const testWebhookEndpoint = async () => {
  const requestCount = 20; // Number of requests to send
  const requestDelay = 1000; // Delay between requests in milliseconds
  
  console.log(`Starting test: Sending ${requestCount} webhook requests with ${requestDelay}ms delay...`);
  
  for (let i = 0; i < requestCount; i++) {
    const webhookData = createOmiWebhookData(i);
    
    try {
      const response = await fetch('http://localhost:11000/omi-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData.body)
      });

      if (!response.ok) {
        console.error(`Failed to send request ${i + 1}:`, response.statusText);
      } else {
        console.log(`Request ${i + 1} sent successfully.`);
        
        // Add query params to URL to simulate real requests
        const queryUrl = `http://localhost:11000/omi-webhook?uid=${webhookData.body.session_id}`;
        
        // Send a GET request with the same session ID to simulate follow-up queries
        if (i % 3 === 0) { // Every third request, send a follow-up GET
          const getResponse = await fetch(queryUrl);
          if (getResponse.ok) {
            console.log(`  ↳ Follow-up GET request for session ${webhookData.body.session_id} sent.`);
          }
        }
      }
      
      // Wait between requests
      if (i < requestCount - 1) {
        await new Promise(resolve => setTimeout(resolve, requestDelay));
      }
    } catch (error) {
      console.error(`Error sending request ${i + 1}:`, error.message);
    }
  }
  
  console.log('Test completed.');
};

testWebhookEndpoint();