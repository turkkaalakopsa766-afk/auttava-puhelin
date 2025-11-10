import express from "express";
import fetch from "node-fetch";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * Asetukset
 * - Twilio TTS: käytetään Amazon Polly -ääntä "Polly.Suvi" (suomi, naisääni)
 * - Gather: suomi (fi-FI), puheentunnistus automaattinen
 */
const TWILIO_VOICE = "Polly.Suvi"; // Vaihtoehto: "Polly.Mikko"
const GATHER_LANGUAGE = "fi-FI";
const GATHER_TIMEOUT_SECONDS = 6; // hiljaisuuden jälkeen lähetä puhe OpenAI:lle

/**
 * GET /
 * Testaa että palvelin elää
 */
app.get("/", (_req, res) => {
  res.type("text/plain").send("Linnea AI - puhelinpalvelin on käynnissä ✅");
});

/**
 * POST /voice
 * Ensimmäinen vastaus puheluun: tervehdi ja käynnistä Gather (puheentunnistus).
 * HUOM: Puhelu katkeaa helposti jos TwiML loppuu. Siksi ohjataan aina Gatheriin
 * ja pidetään loop käynnissä <Redirect>-komennolla.
 */
app.post("/voice", async (req, res) => {
  const vr = new twilio.twiml.VoiceResponse();

  // Tervehdys suomeksi selkeällä äänellä
  vr.say(
    {
      voice: TWILIO_VOICE,
      language: GATHER_LANGUAGE
    },
    "Hei, täällä Linnea. Kiva kun soitit. Kerro vain omin sanoin, mikä fiilis tänään?"
  );

  // Kuuntele soittajaa – lähetä puhe /gather-reitille
  const gather = vr.gather({
    input: "speech",
    language: GATHER_LANGUAGE,
    speechTimeout: "auto", // lopettaa, kun puhuja vaikenee
    action: "/gather",
    method: "POST",
    timeout: GATHER_TIMEOUT_SECONDS
  });

  // Jos mitään ei sanota, silmukoi takaisin Gatheriin
  vr.redirect("/voice");

  res.type("text/xml").send(vr.toString());
});

/**
 * POST /gather
 * Twilio lähettää tänne puheentunnistuksen tuloksen (SpeechResult).
 * Tehdään OpenAI:lla lyhyt empaattinen vastaus suomeksi ja puhutaaan se takaisin.
 * Sitten redirect /loop jotta puhelu pysyy auki ja jatkuu.
 */
app.post("/gather", async (req, res) => {
  const userText = (req.body.SpeechResult || "").trim();
  const vr = new twilio.twiml.VoiceResponse();

  let reply = "Ymmärsin. Kerro lisää, kuuntelen.";

  try {
    const systemPrompt =
      "Olet Linnea, empaattinen ja lempeä suomea puhuva keskustelukumppani. Vastaa lyhyesti (1–2 virkettä), selkeällä yleiskielellä. Vältä ammattisanoja. Tsemppaa kevyesti.";

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              userText && userText.length > 0
                ? `Soittaja sanoo: "${userText}"`
                : "Soittaja oli hiljaa tai epäselvä. Vastaa silti lempeästi ja kysy avoin jatkokysymys."
          }
        ]
      })
    });

    const data = await aiResp.json();
    reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Kiitos kun kerroit. Haluatko sanoa siitä vielä vähän lisää?";
  } catch (e) {
    console.error("OpenAI-virhe:", e);
  }

  // Puhu vastaus suomeksi (Polly.Suvi) ja palaa kuuntelemaan
  vr.say({ voice: TWILIO_VOICE, language: GATHER_LANGUAGE }, reply);

  // Pieni tauko luonnollisuuden vuoksi
  vr.pause({ length: 1 });

  // Jatka keskustelua: takaisin kuuntelemaan
  vr.redirect("/loop");

  res.type("text/xml").send(vr.toString());
});

/**
 * POST /loop
 * Jatkuva keskustelusilmukka: kuuntele uudelleen ja ohjaa takaisin /gather
 * → näin puhelu ei katkea parin sekunnin jälkeen.
 */
app.post("/loop", async (_req, res) => {
  const vr = new twilio.twiml.VoiceResponse();

  const gather = vr.gather({
    input: "speech",
    language: GATHER_LANGUAGE,
    speechTimeout: "auto",
    action: "/gather",
    method: "POST",
    timeout: GATHER_TIMEOUT_SECONDS
  });

  // Jos ei tule puhetta, jatka silmukkaa
  vr.redirect("/loop");

  res.type("text/xml").send(vr.toString());
});

// Portti
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Linnea AI server running on port ${PORT}`));
