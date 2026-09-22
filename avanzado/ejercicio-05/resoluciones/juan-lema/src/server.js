import { createApp } from "./app.js";

const port = process.env.PORT || 5005;
createApp().listen(port, () => console.log(`API de fichajes escuchando en http://localhost:${port}`));
