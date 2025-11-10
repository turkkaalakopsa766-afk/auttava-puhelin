import express from "express";
import twilio from "twilio";

// Node 18+: globaali fetch on olemassa. Jos käytät vanhempaa, lisää node-fetch -kirjasto.
const app = express();
app.use(express.urlencoded({ extended: true })); // Twilio POST -> x-www-form-urlencoded

const { OPENAI_API_KEY } = process.env;

// Alku: tervehdi ja pyydä puhetta (fi-FI), lähetä puhe /gather-reitille
app.post("/voice", (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  // Tervehdys ja ohje
  twiml.say(
    { voice: "Polly.Matthew", language: "fi-FI" },
    "Hei, täällä on Linnea. Kiva kun soitit. Kerro vapaasti, mitä sinulla on mielessä."
  );

  // Kuunnellaan käyttäjän puhetta (max ~6s hiljaisuus päätökseen). Kun valmis -> /gather
  const gather = twiml.gather({
    input: "speech",
    language: "fi-FI",
    speechTimeout: "auto",
    action: "/gather",
    method: "POST"
  });

  // Jos Gather ei aktivoidu (ei puhetta), anna vielä lyhyt kehotus ja palaa tähän
  gather.say(
    { voice: "Polly.Matthew", language: "fi-FI" },
    "Olen täällä sinua varten. Voit aloittaa puhumisen milloin vain."
  );

  twiml.pause({ length: 1 });

  res.type("text/xml").send(twiml.toString());
});

// Vastaanota puhe (SpeechResult), tee AI-vastaus, puhu se takaisin, loop takaisin /voice
app.post("/gather", async (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  const userText =
    (req.body.SpeechResult && req.body.SpeechResult.trim()) ||
    "";

  try {
    // Jos ei tullut puhetta, pyydä uudestaan ja palaa alkuun
    if (!userText) {
      twiml.say(
        { voice: "Polly.Matthew", language: "fi-FI" },
        "En aivan saanut selvää. Voitko toistaa?"
      );
      twiml.redirect({ method: "POST" }, "/voice");
      return res.type("text/xml").send(twiml.toString());
    }

    // Kutsu OpenAI: tiivis, empaattinen vastaus suomeksi
    const aiPrompt = `
Olet empaattinen, lyhyesti puhuva suomenkielinen keskustelukumppani nimeltä Linnea.
Tavoitteesi: kuuntele, validoi tunteet, kysy lempeä jatkokysymys.
Vältä liian pitkiä monologeja. Vastaa 1–2 lauseella.
Käyttäjä sanoi: ${userText}
Vastaus:
`.trim();

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Puhu suomea. Ole lämmin ja rauhallinen." },
          { role: "user", content: aiPrompt }
        ],
        temperature: 0.7,
        max_tokens: 120
      })
    });

    const data = await aiResp.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Ymmärrän. Kerro vielä lisää, haluan kuulla sinusta.";

    // Puhu vastaus Twilion TTS:llä (Polly.* äänet Twilion kautta)
    twiml.say(
      { voice: "Polly.Matthew", language: "fi-FI" },
      reply
    );

    // Palaa alkuun kuuntelemaan lisää → jatkuu loopissa
    twiml.redirect({ method: "POST" }, "/voice");
    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("Virhe /gather:", err);
    twiml.say(
      { voice: "Polly.Matthew", language: "fi-FI" },
      "Pahoittelut, minulla on hetken häiriö. Yritetään uudelleen pian."
    );
    twiml.redirect({ method: "POST" }, "/voice");
    res.type("text/xml").send(twiml.toString());
  }
});

// Terveyscheck
app.get("/", (_req, res) => res.send("Linnea AI-puhelin on käynnissä"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
