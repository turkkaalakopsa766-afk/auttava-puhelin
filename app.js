import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: true }));

// Tämä vastaa Twilion puheluihin
app.post("/voice", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Tervehdys suomeksi Amazon Pollyn naisäänellä
  twiml.say(
    {
      language: "fi-FI",
      voice: "Polly.Suomi",
    },
    "Hei, täällä on Linnea. Kiva kun soitit. Tämä on testipuhelu. Kuuleeko minua?"
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/", (req, res) => {
  res.send("Linnea AI -puhelin toimii ja vastaa nyt varmasti!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
