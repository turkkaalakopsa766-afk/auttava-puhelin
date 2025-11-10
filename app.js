import express from "express";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

// Twilion webhooki
app.post("/voice", async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  try {
    // Luodaan tervehdys ja AI:n vastaus
    const userMessage = "Hei, kuka siellä?"; // Voidaan muuttaa dynaamiseksi myöhemmin
    const aiPrompt = `
      Olet empaattinen ja ystävällinen tekoäly, joka toimii nimellä Linnea.
      Linnea on lämminhenkinen keskustelukumppani, joka kuuntelee yksinäisiä ihmisiä
      ja vastaa rauhallisesti, lempeällä äänellä. Käytä lyhyitä, inhimillisiä vastauksia.
      Keskustelun aluksi sano jotain kuten: "Hei, täällä on Linnea. Kiva kun soitit. Miten voit tänään?"
    `;

    // Haetaan vastaus OpenAI:lta
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: aiPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await aiResponse.json();
    const reply = data.choices?.[0]?.message?.content || "Hei, täällä on Linnea.";

    // Luo puhe ElevenLabsin avulla
    const ttsResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: reply,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // Vastaa Twiliolle äänitiedostolla
    twiml.play(`data:audio/mp3;base64,${audioBase64}`);

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.error("Virhe:", error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Valitettavasti yhteys tekoälyyn epäonnistui. Yritä hetken päästä uudelleen.");
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

app.get("/", (req, res) => {
  res.send("Linnea AI-puhelin on käynnissä!");
});

app.listen(3000, () => console.log("Server running on port 3000"));
