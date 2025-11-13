class VoiceTranslator {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isRecording = false;
        this.sourceLanguage = 'en-US';
        this.targetLanguage = 'es-ES';
        this.translationHistory = [];
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioChunks = [];

        // Load API configuration
        this.apiConfig = typeof API_CONFIG !== 'undefined' ? API_CONFIG : {
            ACTIVE_API: 'webspeech'
        };

        this.initializeElements();
        this.initializeSpeechRecognition();
        this.attachEventListeners();
        this.loadTranslationHistory();
        this.updateLanguageIndicators();
    }

    initializeElements() {
        this.elements = {
            sourceLanguage: document.getElementById('sourceLanguage'),
            targetLanguage: document.getElementById('targetLanguage'),
            sourceText: document.getElementById('sourceText'),
            targetText: document.getElementById('targetText'),
            startRecording: document.getElementById('startRecording'),
            stopRecording: document.getElementById('stopRecording'),
            translateBtn: document.getElementById('translateBtn'),
            speakTranslation: document.getElementById('speakTranslation'),
            swapLanguages: document.getElementById('swapLanguages'),
            clearSource: document.getElementById('clearSource'),
            copyTranslation: document.getElementById('copyTranslation'),
            sourceCount: document.getElementById('sourceCount'),
            targetCount: document.getElementById('targetCount'),
            sourceIndicator: document.getElementById('sourceIndicator'),
            targetIndicator: document.getElementById('targetIndicator'),
            statusDisplay: document.getElementById('statusDisplay'),
            historyList: document.getElementById('historyList'),
            clearHistory: document.getElementById('clearHistory')
        };
    }

    initializeSpeechRecognition() {
        // Use Web Speech API for speech recognition (always available)
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.sourceLanguage;

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateStatus('Recording...', true);
                this.elements.startRecording.classList.add('recording');
                this.elements.stopRecording.disabled = false;
            };

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const currentText = this.elements.sourceText.textContent.replace('Start speaking or type here...', '');
                this.elements.sourceText.textContent = currentText + finalTranscript + interimTranscript;
                this.updateCharCount();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateStatus(`Error: ${event.error}`, false);
                this.stopRecording();
            };

            this.recognition.onend = () => {
                if (this.isRecording) {
                    this.recognition.start();
                }
            };
        } else {
            console.warn('Speech recognition not supported. Using alternative method.');
            this.initializeAdvancedRecording();
        }
    }

    // Advanced recording for browsers without Web Speech API
    async initializeAdvancedRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // MediaRecorder for audio capture
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.audioChunks = [];

                // Send to selected API for transcription
                await this.transcribeAudio(audioBlob);
            };
        } catch (error) {
            console.error('Microphone access denied:', error);
            this.updateStatus('Microphone access required', false);
        }
    }

    attachEventListeners() {
        this.elements.startRecording.addEventListener('click', () => this.startRecording());
        this.elements.stopRecording.addEventListener('click', () => this.stopRecording());
        this.elements.translateBtn.addEventListener('click', () => this.translateText());
        this.elements.speakTranslation.addEventListener('click', () => this.speakTranslation());
        this.elements.swapLanguages.addEventListener('click', () => this.swapLanguages());
        this.elements.clearSource.addEventListener('click', () => this.clearSource());
        this.elements.copyTranslation.addEventListener('click', () => this.copyTranslation());
        this.elements.clearHistory.addEventListener('click', () => this.clearHistory());

        this.elements.sourceLanguage.addEventListener('change', (e) => {
            this.sourceLanguage = e.target.value;
            if (this.recognition) {
                this.recognition.lang = this.sourceLanguage;
            }
            this.updateLanguageIndicators();
        });

        this.elements.targetLanguage.addEventListener('change', (e) => {
            this.targetLanguage = e.target.value;
            this.updateLanguageIndicators();
        });

        this.elements.sourceText.addEventListener('input', () => {
            this.updateCharCount();
        });
    }

    startRecording() {
        if (this.recognition && !this.isRecording) {
            this.recognition.start();
            this.elements.startRecording.disabled = true;
        } else if (this.mediaRecorder && this.mediaRecorder.state !== 'recording') {
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateStatus('Recording...', true);
            this.elements.startRecording.classList.add('recording');
            this.elements.stopRecording.disabled = false;
        }
    }

    stopRecording() {
        if (this.recognition && this.isRecording) {
            this.isRecording = false;
            this.recognition.stop();
            this.elements.startRecording.classList.remove('recording');
            this.elements.startRecording.disabled = false;
            this.elements.stopRecording.disabled = true;
            this.updateStatus('Recording stopped', false);

            setTimeout(() => this.translateText(), 500);
        } else if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.elements.startRecording.classList.remove('recording');
            this.elements.stopRecording.disabled = true;
            this.updateStatus('Processing...', true);
        }
    }

    // Transcribe audio using selected API
    async transcribeAudio(audioBlob) {
        const activeAPI = this.apiConfig.ACTIVE_API;

        try {
            let transcription = '';

            switch (activeAPI) {
                case 'google':
                    transcription = await this.transcribeWithGoogle(audioBlob);
                    break;
                case 'azure':
                    transcription = await this.transcribeWithAzure(audioBlob);
                    break;
                case 'deepgram':
                    transcription = await this.transcribeWithDeepgram(audioBlob);
                    break;
                case 'assemblyai':
                    transcription = await this.transcribeWithAssemblyAI(audioBlob);
                    break;
                default:
                    throw new Error('No transcription API configured');
            }

            this.elements.sourceText.textContent = transcription;
            this.updateCharCount();
            await this.translateText();

        } catch (error) {
            console.error('Transcription error:', error);
            this.updateStatus('Transcription failed', false);
        }
    }

    // Google Cloud Speech-to-Text
    async transcribeWithGoogle(audioBlob) {
        const base64Audio = await this.blobToBase64(audioBlob);

        const response = await fetch(
            `${this.apiConfig.GOOGLE.SPEECH_ENDPOINT}?key=${this.apiConfig.GOOGLE.API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        encoding: 'WEBM_OPUS',
                        sampleRateHertz: 48000,
                        languageCode: this.sourceLanguage.substring(0, 2)
                    },
                    audio: { content: base64Audio.split(',')[1] }
                })
            }
        );

        const data = await response.json();
        return data.results?.[0]?.alternatives?.[0]?.transcript || '';
    }

    // Azure Speech Services
    async transcribeWithAzure(audioBlob) {
        const region = this.apiConfig.AZURE.REGION;
        const endpoint = this.apiConfig.AZURE.SPEECH_ENDPOINT.replace('{region}', region);

        const response = await fetch(
            `${endpoint}?language=${this.sourceLanguage}`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiConfig.AZURE.SUBSCRIPTION_KEY,
                    'Content-Type': 'audio/wav'
                },
                body: audioBlob
            }
        );

        const data = await response.json();
        return data.DisplayText || '';
    }

    // Deepgram Speech-to-Text (Fastest & Most Accurate)
    async transcribeWithDeepgram(audioBlob) {
        const response = await fetch(
            `${this.apiConfig.DEEPGRAM.ENDPOINT}?model=${this.apiConfig.DEEPGRAM.MODEL}&language=${this.sourceLanguage.substring(0, 2)}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.apiConfig.DEEPGRAM.API_KEY}`,
                    'Content-Type': 'audio/webm'
                },
                body: audioBlob
            }
        );

        const data = await response.json();
        return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    }

    // AssemblyAI Speech-to-Text
    async transcribeWithAssemblyAI(audioBlob) {
        // First, upload audio file
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
                'authorization': this.apiConfig.ASSEMBLYAI.API_KEY
            },
            body: audioBlob
        });

        const { upload_url } = await uploadResponse.json();

        // Then, request transcription
        const transcriptResponse = await fetch(this.apiConfig.ASSEMBLYAI.ENDPOINT, {
            method: 'POST',
            headers: {
                'authorization': this.apiConfig.ASSEMBLYAI.API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: upload_url,
                language_code: this.sourceLanguage.substring(0, 2)
            })
        });

        const { id } = await transcriptResponse.json();

        // Poll for result
        return await this.pollAssemblyAI(id);
    }

    async pollAssemblyAI(transcriptId) {
        while (true) {
            const response = await fetch(
                `${this.apiConfig.ASSEMBLYAI.ENDPOINT}/${transcriptId}`,
                {
                    headers: {
                        'authorization': this.apiConfig.ASSEMBLYAI.API_KEY
                    }
                }
            );

            const data = await response.json();

            if (data.status === 'completed') {
                return data.text;
            } else if (data.status === 'error') {
                throw new Error('Transcription failed');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Translation Methods
    async translateText() {
        const sourceText = this.elements.sourceText.textContent.replace('Start speaking or type here...', '').trim();

        if (!sourceText) {
            this.updateStatus('Please provide text to translate', false);
            return;
        }

        this.updateStatus('Translating...', true);

        try {
            let translatedText = '';
            const activeAPI = this.apiConfig.ACTIVE_API;

            switch (activeAPI) {
                case 'google':
                    translatedText = await this.translateWithGoogle(sourceText);
                    break;
                case 'azure':
                    translatedText = await this.translateWithAzure(sourceText);
                    break;
                default:
                    translatedText = await this.translateWithMyMemory(sourceText);
            }

            this.elements.targetText.textContent = translatedText;
            this.updateCharCount();
            this.updateStatus('Translation complete', false);

            this.addToHistory(sourceText, translatedText);
            setTimeout(() => this.speakTranslation(), 500);

        } catch (error) {
            console.error('Translation error:', error);
            this.updateStatus('Translation error. Trying fallback...', false);

            // Fallback to MyMemory
            try {
                const fallbackTranslation = await this.translateWithMyMemory(sourceText);
                this.elements.targetText.textContent = fallbackTranslation;
                this.updateCharCount();
                this.addToHistory(sourceText, fallbackTranslation);
            } catch (fallbackError) {
                this.updateStatus('Translation failed', false);
            }
        }
    }

    // Google Cloud Translation
    async translateWithGoogle(text) {
        const sourceLang = this.sourceLanguage.split('-')[0];
        const targetLang = this.targetLanguage.split('-')[0];

        const response = await fetch(
            `${this.apiConfig.GOOGLE.TRANSLATE_ENDPOINT}?key=${this.apiConfig.GOOGLE.API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            }
        );

        const data = await response.json();
        return data.data.translations[0].translatedText;
    }

    // Azure Translator
    async translateWithAzure(text) {
        const sourceLang = this.sourceLanguage.split('-')[0];
        const targetLang = this.targetLanguage.split('-')[0];

        const response = await fetch(
            `${this.apiConfig.AZURE.TRANSLATE_ENDPOINT}?api-version=3.0&from=${sourceLang}&to=${targetLang}`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiConfig.AZURE.SUBSCRIPTION_KEY,
                    'Ocp-Apim-Subscription-Region': this.apiConfig.AZURE.REGION,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ text: text }])
            }
        );

        const data = await response.json();
        return data[0].translations[0].text;
    }

    // MyMemory Translation (Free Fallback)
    async translateWithMyMemory(text) {
        const sourceLang = this.sourceLanguage.split('-')[0];
        const targetLang = this.targetLanguage.split('-')[0];

        const response = await fetch(
            `${this.apiConfig.MYMEMORY.ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );

        const data = await response.json();

        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        }

        throw new Error('Translation failed');
    }

    speakTranslation() {
        const translatedText = this.elements.targetText.textContent.replace('Translation will appear here...', '').trim();

        if (!translatedText) {
            this.updateStatus('No translation to speak', false);
            return;
        }

        // Check if using advanced TTS API
        if (this.apiConfig.ACTIVE_API === 'google' || this.apiConfig.ACTIVE_API === 'azure') {
            this.speakWithAPI(translatedText);
        } else {
            this.speakWithBrowser(translatedText);
        }
    }

    // Browser TTS (Free)
    speakWithBrowser(text) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.targetLanguage;
        utterance.rate = 0.9;
        utterance.pitch = 1;

        const voices = this.synthesis.getVoices();
        const matchingVoice = voices.find(voice => voice.lang.startsWith(this.targetLanguage.split('-')[0]));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        utterance.onstart = () => this.updateStatus('Speaking translation...', true);
        utterance.onend = () => this.updateStatus('Translation spoken', false);
        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            this.updateStatus('Error speaking translation', false);
        };

        this.synthesis.speak(utterance);
    }

    // Advanced TTS with Google or Azure
    async speakWithAPI(text) {
        try {
            if (this.apiConfig.ACTIVE_API === 'google') {
                await this.speakWithGoogle(text);
            } else if (this.apiConfig.ACTIVE_API === 'azure') {
                await this.speakWithAzure(text);
            }
        } catch (error) {
            console.error('API TTS error:', error);
            // Fallback to browser TTS
            this.speakWithBrowser(text);
        }
    }

    async speakWithGoogle(text) {
        const response = await fetch(
            `${this.apiConfig.GOOGLE.TTS_ENDPOINT}?key=${this.apiConfig.GOOGLE.API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: text },
                    voice: {
                        languageCode: this.targetLanguage,
                        ssmlGender: 'NEUTRAL'
                    },
                    audioConfig: { audioEncoding: 'MP3' }
                })
            }
        );

        const data = await response.json();
        const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
        audio.play();
    }

    async speakWithAzure(text) {
        const region = this.apiConfig.AZURE.REGION;
        const endpoint = this.apiConfig.AZURE.TTS_ENDPOINT.replace('{region}', region);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiConfig.AZURE.SUBSCRIPTION_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            body: `<speak version='1.0' xml:lang='${this.targetLanguage}'>
                    <voice xml:lang='${this.targetLanguage}' name='${this.getAzureVoiceName()}'>
                        ${text}
                    </voice>
                   </speak>`
        });

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    }

    getAzureVoiceName() {
        const voiceMap = {
            'en-US': 'en-US-JennyNeural',
            'es-ES': 'es-ES-ElviraNeural',
            'fr-FR': 'fr-FR-DeniseNeural',
            'de-DE': 'de-DE-KatjaNeural',
            'it-IT': 'it-IT-ElsaNeural',
            'ja-JP': 'ja-JP-NanamiNeural',
            'zh-CN': 'zh-CN-XiaoxiaoNeural'
        };
        return voiceMap[this.targetLanguage] || voiceMap['en-US'];
    }

    // Helper Functions
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    swapLanguages() {
        const temp = this.sourceLanguage;
        this.sourceLanguage = this.targetLanguage;
        this.targetLanguage = temp;

        this.elements.sourceLanguage.value = this.sourceLanguage;
        this.elements.targetLanguage.value = this.targetLanguage;

        const tempText = this.elements.sourceText.textContent;
        this.elements.sourceText.textContent = this.elements.targetText.textContent;
        this.elements.targetText.textContent = tempText;

        if (this.recognition) {
            this.recognition.lang = this.sourceLanguage;
        }

        this.updateLanguageIndicators();
        this.updateCharCount();
    }

    clearSource() {
        this.elements.sourceText.innerHTML = '<span class="placeholder">Start speaking or type here...</span>';
        this.updateCharCount();
    }

    copyTranslation() {
        const translatedText = this.elements.targetText.textContent.replace('Translation will appear here...', '').trim();

        if (translatedText) {
            navigator.clipboard.writeText(translatedText).then(() => {
                this.updateStatus('Translation copied!', false);

                const originalIcon = this.elements.copyTranslation.innerHTML;
                this.elements.copyTranslation.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    this.elements.copyTranslation.innerHTML = originalIcon;
                }, 2000);
            });
        }
    }

    addToHistory(sourceText, targetText) {
        const historyItem = {
            source: sourceText,
            target: targetText,
            sourceLang: this.getLanguageName(this.sourceLanguage),
            targetLang: this.getLanguageName(this.targetLanguage),
            timestamp: new Date().toISOString()
        };

        this.translationHistory.unshift(historyItem);

        if (this.translationHistory.length > 10) {
            this.translationHistory.pop();
        }

        this.saveTranslationHistory();
        this.renderHistory();
    }

    renderHistory() {
        if (this.translationHistory.length === 0) {
            this.elements.historyList.innerHTML = '<p class="no-history">No translation history yet. Start translating!</p>';
            return;
        }

        this.elements.historyList.innerHTML = this.translationHistory.map(item => {
            const date = new Date(item.timestamp);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-languages">${item.sourceLang} → ${item.targetLang}</span>
                        <span class="history-time">${timeString}</span>
                    </div>
                    <div class="history-content">
                        <div class="history-text">${item.source}</div>
                        <i class="fas fa-arrow-right history-arrow"></i>
                        <div class="history-text">${item.target}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all translation history?')) {
            this.translationHistory = [];
            this.saveTranslationHistory();
            this.renderHistory();
            this.updateStatus('History cleared', false);
        }
    }

    saveTranslationHistory() {
        localStorage.setItem('translationHistory', JSON.stringify(this.translationHistory));
    }

    loadTranslationHistory() {
        const saved = localStorage.getItem('translationHistory');
        if (saved) {
            this.translationHistory = JSON.parse(saved);
            this.renderHistory();
        }
    }

    updateStatus(message, isActive) {
        const statusText = this.elements.statusDisplay.querySelector('.status-text');
        const statusDot = this.elements.statusDisplay.querySelector('.status-dot');
        const visualizer = this.elements.statusDisplay.querySelector('.audio-visualizer');

        statusText.textContent = message;

        if (isActive) {
            statusDot.classList.add('recording');
            visualizer.style.opacity = '1';
        } else {
            statusDot.classList.remove('recording');
            visualizer.style.opacity = '0.3';
        }
    }

    updateCharCount() {
        const sourceText = this.elements.sourceText.textContent.replace('Start speaking or type here...', '').trim();
        const targetText = this.elements.targetText.textContent.replace('Translation will appear here...', '').trim();

        this.elements.sourceCount.textContent = `${sourceText.length} characters`;
        this.elements.targetCount.textContent = `${targetText.length} characters`;
    }

    updateLanguageIndicators() {
        this.elements.sourceIndicator.textContent = this.getLanguageName(this.sourceLanguage);
        this.elements.targetIndicator.textContent = this.getLanguageName(this.targetLanguage);
    }

    getLanguageName(code) {
        const languages = {
            'en-US': 'English (US)',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'pt-PT': 'Portuguese',
            'ru-RU': 'Russian',
            'zh-CN': 'Chinese',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'ar-SA': 'Arabic',
            'hi-IN': 'Hindi',
            'tr-TR': 'Turkish',
            'pl-PL': 'Polish',
            'nl-NL': 'Dutch',
            'sv-SE': 'Swedish',
            'da-DK': 'Danish',
            'fi-FI': 'Finnish',
            'no-NO': 'Norwegian',
            'cs-CZ': 'Czech'
        };
        return languages[code] || code;
    }
}

// Initialize translator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const translator = new VoiceTranslator();

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
});
