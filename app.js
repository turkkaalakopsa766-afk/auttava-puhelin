import express from "express";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

// Twilion webhooki
app.post("/voice", async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Luodaan AI:n tervehdys
  const aiPrompt = `Olet empaattinen ja ystävällinen tekoäly nimeltä Linnea. Linnea keskustelee yksinäisten ihmisten kanssa lempeällä ja rauhallisella äänellä. Vastaa lyhyesti ja lämpimästi. Aloita vaikka: "Hei, täällä Linnea. Miten voit tänään?"`;

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: aiPrompt }],
      }),
    });

    const data = await aiResponse.json();
    const aiText = data.choices?.[0]?.message?.content || "Hei, täällä Linnea. Miten voit tänään?";

    twiml.say(aiText, { voice: "Polly.Joanna" });
  } catch (error) {
    console.error("Virhe OpenAI-kutsussa:", error);
    twiml.say("Hei, täällä Linnea. Kiva kun soitit. Miten voit tänään?");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/", (req, res) => {
  res.send("Linnea AI-puhelin on käynnissä!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
