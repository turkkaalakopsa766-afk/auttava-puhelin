import express from "express";
import twilio from "twilio";

const app = express();

// Twilio lähettää /voice-endpointtiin x-www-form-urlencoded POSTin
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get("/", (req, res) => {
  res.send("Linnea AI -puhelin on käynnissä");
});

// Twilio Voice Webhook
app.post("/voice", async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Twilion oma TTS: 'alice' + language: 'fi-FI' = selkeä suomalainen ääni
  twiml.say(
    { voice: "alice", language: "fi-FI" },
    "Hei, täällä Linnea. Kiva kun soitit. Miten voit tänään?"
  );

  // Jätetään pieni hiljaisuus, jotta kuulet tervehdyksen loppuun
  twiml.pause({ length: 8 });

  res.type("text/xml").send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
