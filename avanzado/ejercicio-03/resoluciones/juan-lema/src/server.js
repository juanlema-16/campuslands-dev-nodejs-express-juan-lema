import { createApp } from "./app.js";

const PORT = process.env.PORT || 5003;

createApp().listen(PORT, () => {
  console.log(`API de MOBA esports escuchando en http://localhost:${PORT}`);
});
