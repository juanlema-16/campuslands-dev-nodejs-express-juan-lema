import { createApp } from "./app.js";

const port = process.env.PORT || 5004;
createApp().listen(port, () => console.log(`Battle royale API escuchando en http://localhost:${port}`));
