const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { default: axios } = require("axios");

const environment = process.env.NODE_ENV || "development";
const envFile = `.env.${environment}`;
dotenv.config({ path: envFile });

const app = express();
app.use(
    cors({
        origin: process.env.JOBONIC_PUBLIC_URL,
        methods: ["GET", "POST"],
    })
);
app.use(express.json());

const ollamaURL = process.env.OLLAMA_URL;
const aiModel = process.env.AI_MODEL;

// methods
    const findArrayInSentence = (sentence) => {
        const arrayPattern = /\[([^\]]*)\]/;
        const match = sentence.match(arrayPattern);
    
        if (match) {
             elements = match[1].split(',').map(item => item.trim().replace(/^['"]|['"]$/g, ''));
            return elements.flatMap( str => str.split(" "));
        }
    
        return [];
    }

    const handleOllamaResponse = (response) => {
        try {
            const lines = response.split("\n");
            let responseText = '';

            lines.forEach(line => {
                if (line.trim()) {
                    const parsed = JSON.parse(line);
                    if (parsed && parsed.response) {
                        responseText += parsed.response;
                    }
                }
            });

            responseText = responseText.trim();
            const result = findArrayInSentence(responseText);
            return result;

        } catch (error) {
            console.error('Failed to handle response:', error);
            return '';
        }
    }

    const generateKeywords = async (prompt) => {
        if(prompt.trim() === '') return;
        try{
            const helperPrompt = `
                Generate an array of keywords (maximun 10 keywords) which is related with my provided sentence or topic.
                A carrier or a work category can also be a keyword.
                For example, if "I say I am sick", you have to generate an array ['doctor', 'nurse']. 
                This time I am going to say that ${prompt}, what will you generate? 
                Just give me back an array with keywords`;

            const res = await axios.post(ollamaURL, {
                model: aiModel,
                prompt: helperPrompt,
                steam: false
            });

            const result = handleOllamaResponse(res.data);
            return result;
        } catch (error) {
            console.log('error', error)
        }
    }

//routes
    app.post("/", async (req, res) => {
        const payload = req.body;
        const prompt = payload.prompt ?? '';

        if (!prompt) {
            return res.status(400).json({ error: "Write some prompt" });
        }

        try {
            const keywords = await generateKeywords(prompt);
            res.json({ keywords });
        } catch (error) {
            res.status(500).json({ error: "Failed to generate keywords" });
        }
    });
    
    const server = http.createServer(app);

// Host
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
        console.log(`AI Server is running on port ${PORT}`);
    });
