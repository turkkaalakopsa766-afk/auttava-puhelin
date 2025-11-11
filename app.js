import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: true }));

// Twilio webhook saapuville puheluille
app.post("/voice", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Jos Amazon Polly -äänet ovat käytössä tililläsi, tämä kuulostaa parhaalta suomeksi:
  // Huom: jos et ole ottanut Polly-ääniä käyttöön Twilion asetuksista,
  // vaihda alla voice -> "alice" ja pidä language: "fi-FI".
  const sayOpts = { voice: "Polly.Suvi", language: "fi-FI" };
  // Jos Polly ei ole käytössä, käytä tätä riviä sen sijaan:
  // const sayOpts = { voice: "alice", language: "fi-FI" };

  // Tervehdys + ohjeistus
  const gather = twiml.gather({
    input: "speech",
    language: "fi-FI",
    speechTimeout: "auto",
    action: "/continue",
    method: "POST",
    timeout: 5
  });

  gather.say(sayOpts, "Hei, täällä Linnea. Kiva kun soitit. Miten voit tänään? Voit puhua vapaasti, kuuntelen.");

  // Jos puhuja ei sano mitään, jatketaan silti
  twiml.redirect("/continue");

  res.type("text/xml").send(twiml.toString());
});

app.post("/continue", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  const sayOpts = { voice: "Polly.Suvi", language: "fi-FI" };
  // Jos Polly ei ole käytössä, käytä tätä riviä sen sijaan:
  // const sayOpts = { voice: "alice", language: "fi-FI" };

  const userSaid = (req.body.SpeechResult || "").trim();

  if (userSaid) {
    twiml.say(sayOpts, `Ymmärsin: ${userSaid}. Kiitos kun kerroit. Olen täällä juttelemassa, aina kun tarvitset.`);
  } else {
    twiml.say(sayOpts, "Kiitos kun soitit. Toivon että päiväsi on kevyt. Soita koska vain uudestaan.");
  }

  twiml.hangup();
  res.type("text/xml").send(twiml.toString());
});

// Terveystarkistus
app.get("/", (_req, res) => {
  res.send("Linnea (perusversio) on käynnissä.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
