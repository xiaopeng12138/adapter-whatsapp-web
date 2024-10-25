import { Adapter, Context, Logger, Schema } from "koishi";
import { } from "@cordisjs/plugin-server";
import WhatsAppBot from "./bot";
import * as WhatsAppWeb from "whatsapp-web.js";
import * as qrcode from "qrcode-terminal";
import path from "path";
import { adaptSession,} from "./utils";
import { on } from "events";

class WhatsAppAdapter<C extends Context> extends Adapter<C, WhatsAppBot<C>> {
  logger: Logger;
  private client: WhatsAppWeb.Client;

  constructor(private cxt: C) {
    super(cxt);
    this.logger = cxt.logger("whatsapp-web");
    this.logger.level = 3;

    this.client = new WhatsAppWeb.Client({
      authStrategy: new WhatsAppWeb.LocalAuth({
        dataPath: path.join(cxt.baseDir, "data", "adapter-whatsapp-web"),
      }),
    });

    cxt.on("ready", async () => {
      this.logger.info("Adapter is ready.");
      this.logger.info("Client start initializing...");
      this.client.initialize();
    });

    this.client.on("qr", (qr) => {
      // Generate and scan this code with your phone
      this.logger.info("QR RECEIVED", qr);
      qrcode.generate(qr, { small: true }, (code) => {
        console.log(code);
        //this.logger.info(code);
      });
    });

    this.client.on("ready", () => {
      this.logger.debug("Client is ready!", this.client.info);

      const bot = new WhatsAppBot(cxt, this.client);
      bot.adapter = this;
      
      this.bots.push(bot);
      bot.online();

      this.logger.debug("Bot created", bot);

      const onEventEmit = async (payload: WhatsAppWeb.GroupNotification | WhatsAppWeb.Chat) => {
        this.logger.debug("Event Emited", JSON.stringify(payload));
        // this.logger.debug("Message rawData", message.rawData);

        const bot = this.getBot(this.client.info.wid._serialized);
        const session = await adaptSession(bot, payload);
        if (session.length)
          session.forEach(bot.dispatch.bind(bot))
        this.logger.debug('handling bot: %s', bot.sid)
        this.logger.debug(JSON.stringify(session))
      };

      this.client.on("message_create", onEventEmit);
      this.client.on("chat_removed", onEventEmit);
      this.client.on("group_admin_changed", onEventEmit);
      this.client.on("group_join", onEventEmit);
      this.client.on("group_leave", onEventEmit);
      this.client.on("group_update", onEventEmit);
      
      this.logger.info("Client is ready!");
    });
  }

  connect(bot: WhatsAppBot<C>): Promise<void> {
    this.logger.info("Adapter is connected.");
    return Promise.resolve();
  }

  disconnect(bot: WhatsAppBot<C>): Promise<void> {
    bot.internal.destroy();

    this.logger.info("WhatsApp adapter is disconnected.");
    return Promise.resolve();
  }

  getBot(selfId: string) {
    for (const bot of this.bots) {
      if (bot.selfId === selfId) return bot;
    }
  }

}

namespace WhatsAppAdapter {
  export interface Config {
    testBool?: boolean;
  }
  export const Config: Schema<Config> = Schema.object({
    testBool: Schema.boolean().description("测试布尔值").default(false),
  });
}

export default WhatsAppAdapter;
