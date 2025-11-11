import express from "express";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

/**
 * Twilio -> /voice
 * Palauttaa TwiML:in, joka soittaa äänen meidän /tts -endpointista.
 * /tts generoi mp3-äänen ElevenLabsilta ja tarjoilee sen Twiliolle.
 */
app.post("/voice", (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  // Tervehdys, jonka /tts muuntaa suomeksi luonnollisena puheena
  const greeting =
    "Hei, täällä on Linnea. Kiitos soitosta. Tämä on testi. Kerro miltä ääneni kuulostaa?";

  // Luo absoluuttinen URL meidän /tts -endpointtiin
  const host = `${req.protocol}://${req.get("host")}`;
  const ttsUrl = `${host}/tts?text=${encodeURIComponent(greeting)}`;

  // Soita /tts tuottama ääni
  twiml.play(ttsUrl);

  // (Valinnainen) lisää pieni hiljaisuus, jotta linja ei sulkeudu heti toiston jälkeen
  // twiml.pause({ length: 2 });

  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * GET /tts?text=...
 * Generoi ElevenLabsilla suomenkielisen puheen ja palauttaa sen mp3:nä Twiliolle.
 *
 * VAATII ympäristömuuttujat:
 * - ELEVENLABS_API_KEY
 * - ELEVENLABS_VOICE_ID   (tämän voice-id:n saat ElevenLabsista "Viisas kertoja" -äänelle)
 */
app.get("/tts", async (req, res) => {
  try {
    const text = (req.query.text ?? "").toString().trim();
    if (!text) {
      return res.status(400).send("Missing ?text");
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID; // <-- Aseta tämä Renderin Environmentiin

    if (!apiKey || !voiceId) {
      return res
        .status(500)
        .send("ELEVENLABS_API_KEY tai ELEVENLABS_VOICE_ID puuttuu.");
    }

    // Käytetään multilingual v2 -mallia, joka tukee suomea luontevasti
    const ttsEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const r = await fetch(ttsEndpoint, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return res.status(500).send(`ElevenLabs error: ${errTxt}`);
    }

    const audioBuf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuf.length);
    res.send(audioBuf);
  } catch (e) {
    console.error("TTS error:", e);
    res.status(500).send("TTS failure");
  }
});

app.get("/", (req, res) => {
  res.send("Linnea AI -puhelin on käynnissä (ElevenLabs TTS) ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
