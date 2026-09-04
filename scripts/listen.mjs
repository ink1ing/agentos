import { createServer } from "../gateway/server.mjs";
import { CONFIG } from "../gateway/config.mjs";
const server = createServer();
server.listen(Number(process.env.PORT || 0), "127.0.0.1", () => {
  process.stdout.write(`PORT=${server.address().port}\n`);
});
