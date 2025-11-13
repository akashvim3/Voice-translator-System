// API Configuration for VoiceTranslate Pro
const API_CONFIG = {
    // Choose your preferred API: 'google', 'azure', 'deepgram', 'assemblyai', 'webspeech'
    ACTIVE_API: 'webspeech', // Default to free Web Speech API

    // Google Cloud Translation & Speech API
    GOOGLE: {
        API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
        TRANSLATE_ENDPOINT: 'https://translation.googleapis.com/language/translate/v2',
        SPEECH_ENDPOINT: 'https://speech.googleapis.com/v1/speech:recognize',
        TTS_ENDPOINT: 'https://texttospeech.googleapis.com/v1/text:synthesize'
    },

    // Microsoft Azure Speech Services
    AZURE: {
        SUBSCRIPTION_KEY: 'YOUR_AZURE_KEY_HERE',
        REGION: 'eastus', // e.g., 'eastus', 'westus', 'westeurope'
        SPEECH_ENDPOINT: 'https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1',
        TRANSLATE_ENDPOINT: 'https://api.cognitive.microsofttranslator.com/translate',
        TTS_ENDPOINT: 'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1'
    },

    // Deepgram (Best performance/cost ratio)
    DEEPGRAM: {
        API_KEY: 'YOUR_DEEPGRAM_API_KEY_HERE',
        ENDPOINT: 'https://api.deepgram.com/v1/listen',
        MODEL: 'nova-2' // Latest model
    },

    // AssemblyAI
    ASSEMBLYAI: {
        API_KEY: 'YOUR_ASSEMBLYAI_KEY_HERE',
        ENDPOINT: 'https://api.assemblyai.com/v2/transcript'
    },

    // MyMemory Translation (Free fallback)
    MYMEMORY: {
        ENDPOINT: 'https://api.mymemory.translated.net/get',
        RATE_LIMIT: 100 // requests per day (free tier)
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
