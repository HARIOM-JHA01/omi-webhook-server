import fetch from "node-fetch";
/**
 * This script tests the webhook endpoint by sending 1000 requests
 * using different HTTP methods (GET, POST, PUT, DELETE).
 * It logs the success or failure of each request.
 */
const testWebhookEndpoint = async () => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];

  for (let i = 0; i < 1000; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    // Skip body for GET/HEAD methods
    if (method !== 'GET' && method !== 'HEAD') {
      options.body = JSON.stringify({ text: `This is a test transcription from Omi AI.` });
    }

    try {
      const response = await fetch('http://localhost:8000/omi-webhook', options);

      if (!response.ok) {
        console.error(`Failed to send request ${i + 1} with method ${method}:`, response.statusText);
      } else {
        console.log(`Request ${i + 1} with method ${method} sent successfully.`);
      }
    } catch (error) {
      console.error(`Error sending request ${i + 1} with method ${method}:`, error.message);
    }
  }
};

testWebhookEndpoint();