const Redis = require("ioredis");

async function connectToRedis() {
  const maxRetries = 10;
  let retries = 0;
  let connected = false;
  let client;

  while (!connected && retries < maxRetries) {
    try {
      console.log(
        `Attempting to connect to Redis Cluster at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT} (Attempt ${retries + 1}/${maxRetries})`
      );

      client = new Redis.Cluster(
        [
          {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
          },
        ],
        {
          redisOptions: { password: process.env.REDIS_PASSWORD },
          scaleReads: "all",
          enableReadyCheck: true,
          maxRedirections: 16,
          retryDelayOnFailover: 2000,
        }
      );

      client.on("error", (err) => console.error("Redis Client Error", err));
      client.on("ready", () => {
        console.log("Connected to Redis Cluster successfully!");
        connected = true;
      });

      await new Promise((resolve) => {
        if (client.status === "ready") resolve();
        else client.once("ready", resolve);
      });

      return client;
    } catch (err) {
      console.error(
        `Failed to connect to Redis (Attempt ${retries + 1}/${maxRetries}):`,
        err
      );
      retries++;
      if (retries < maxRetries) {
        console.log(`Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error("Max retries reached. Could not connect to Redis.");
        process.exit(1);
      }
    }
  }
}

module.exports = { connectToRedis };
