import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: true }));

app.post("/voice", (req, res) => {
  const { VoiceResponse } = twilio.twiml;
  const twiml = new VoiceResponse();

  // yksinkertainen tervehdys
  twiml.say({ voice: "Polly.Joanna", language: "fi-FI" }, "Hei, täällä Linnea. Tämä on testipuhelu. Mukava kuulla sinusta.");

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/", (req, res) => {
  res.send("Linnea testiserveri toimii Renderissä ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
