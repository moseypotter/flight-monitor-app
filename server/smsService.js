const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

let client;

function initializeTwilio() {
  if (!accountSid || !authToken || !twilioNumber) {
    console.log('⚠️  Twilio credentials not set. SMS notifications disabled.');
    return false;
  }
  
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
    console.log(`📱 Sending from: ${twilioNumber}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Twilio:', error.message);
    return false;
  }
}

async function sendSMS(phoneNumber, message) {
  if (!client) {
    console.log('SMS not sent - Twilio not initialized');
    return { success: false, error: 'Twilio not initialized' };
  }
  
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: phoneNumber
    });
    
    console.log(`✅ SMS sent to ${phoneNumber}! SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendDelayNotificationToAll(flight, delayMinutes, phoneNumbers) {
  const message = `🚨 FLIGHT DELAY\n\n` +
                  `${flight.flightNumber} (${flight.airline})\n` +
                  `${flight.departure.iata} → ${flight.arrival.iata}\n` +
                  `Delay: ${delayMinutes} min\n` +
                  `New time: ${flight.departure.estimatedTime || 'TBA'}`;
  
  const results = [];
  for (const phone of phoneNumbers) {
    const result = await sendSMS(phone, message);
    results.push({ phone, ...result });
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

module.exports = {
  initializeTwilio,
  sendSMS,
  sendDelayNotificationToAll
};