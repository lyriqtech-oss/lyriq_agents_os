import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

async function run() {
  try {
    if (!apiKey) {
      console.log('Set GEMINI_API_KEY environment variable to test.');
      return;
    }
    console.log('Instantiating GoogleGenerativeAI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Sending message "quanto é 1+1"...');
    const result = await model.generateContent('quanto é 1+1');
    console.log('Result text:', result.response.text());
  } catch (err) {
    console.error('Caught error:', err);
  }
}

run();
