import express from "express";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();

// Twilio lähettää application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Valitse ääni tähän: "Polly.Suvi" (nainen) tai "Polly.Mikko" (mies)
const FINNISH_VOICE = process.env.FI_VOICE || "Polly.Suvi";

// Tervehdys ja ohjaus puheentunnistukseen
app.post("/voice", (req, res) => {
  const vr = new twilio.twiml.VoiceResponse();

  // Kerrotaan heti jotain (jotta puhelu ei katkea) ja pyydetään puhumaan
  const gather = vr.gather({
    input: "speech",
    language: "fi-FI",     // Twilion STT tukee suomea
    speechTimeout: "auto", // odottaa kunnes puhuja lopettaa
    action: "/gather",     // kun puhe tulkittu → tänne
    method: "POST",
    timeout: 6             // max hiljaisuus sekunteina ennen gatherin päättymistä
  });

  // Lyhyt, selkeä, heti kuuluva tervehdys
  gather.say({ voice: FINNISH_VOICE }, 
    "Hei, täällä Linnea. Kiva kun soitit. Kerro vapaasti, mitä sinulle kuuluu tänään."
  );

  // Jos käyttäjä ei sanonut mitään → annetaan uusi mahdollisuus
  vr.say({ voice: FINNISH_VOICE }, 
    "En ihan kuullut. Sano vaikka lyhyesti, mikä mieltä painaa."
  );
  vr.redirect("/voice");

  res.type("text/xml").send(vr.toString());
});

// OpenAI:lle viesti ja vastaus takaisin puheena
app.post("/gather", async (req, res) => {
  const userText = (req.body.SpeechResult || "").trim();
  const vr = new twilio.twiml.VoiceResponse();

  try {
    let replyText = "Kiitos kun soitit. Miten voisin olla avuksi?";

    if (userText) {
      // Tuota lyhyt, empaattinen, selkeä vastaus suomeksi
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Puhu suomea. Olet empaattinen, rauhallinen ja ystävällinen keskustelukumppani nimeltä Linnea. Pidä vastaukset lyhyinä (1–2 virkettä), selkeinä ja ihmismäisinä."
            },
            { role: "user", content: userText }
          ],
          temperature: 0.7,
          max_tokens: 120
        })
      });

      const data = await aiResp.json();
      replyText =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Ymmärrän. Kerro lisää, kuuntelen.";
    }

    // Vastaa puheella suomeksi
    vr.say({ voice: FINNISH_VOICE }, replyText);

    // Jatketaan keskustelua: kysytään lisää ja ohjataan takaisin /voice
    vr.pause({ length: 0.5 });
    vr.say({ voice: FINNISH_VOICE }, "Haluatko kertoa lisää?")
    vr.redirect("/voice");

    res.type("text/xml").send(vr.toString());
  } catch (err) {
    console.error("Virhe /gather:", err);
    // Fallback: ei katkaista puhelua, vastataan selkeästi ja jatketaan
    vr.say({ voice: FINNISH_VOICE },
      "Pahoittelut, minulla oli hetken ongelma. Voitko sanoa äskeisen vielä uudelleen?"
    );
    vr.redirect("/voice");
    res.type("text/xml").send(vr.toString());
  }
});

// Healthcheck / juurisivu
app.get("/", (_req, res) => {
  res.send("Linnea AI -puhelin on käynnissä (Twilio Voice + OpenAI).");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
