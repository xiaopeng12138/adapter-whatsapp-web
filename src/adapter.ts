import { Adapter, Context, Logger, Schema } from "koishi";
import { } from "@cordisjs/plugin-server";
import {WhatsAppBot} from "./bot";
import * as WhatsAppWeb from "whatsapp-web.js";
import * as qrcode from "qrcode-terminal";
import { adaptSession,} from "./utils";

class WhatsAppAdapter<C extends Context = Context> extends Adapter<C, WhatsAppBot<C>> {

  async connect(bot: WhatsAppBot<C>){

    this.ctx.on("ready", async () => {
      bot.logger.info("Adapter is ready.");
      bot.logger.info("Client start initializing...");
      bot.internal.initialize();
    });

    bot.internal.on("qr", (qr) => {
      // Generate and scan this code with your phone
      bot.logger.info("QR RECEIVED", qr);
      qrcode.generate(qr, { small: true }, (code) => {
        console.log(code);
        //bot.logger.info(code);
      });
    });

    bot.internal.on("ready", async () => {
      bot.logger.debug("Client is ready!", bot.internal.info);

      bot.adapter = this;
      
      await bot.getLogin();
      bot.online();
      bot.logger.debug("Bot created", bot);

      const onEventEmit = async (payload: WhatsAppWeb.GroupNotification | WhatsAppWeb.Chat) => {
        bot.logger.debug("Event Emited", JSON.stringify(payload));
        // bot.logger.debug("Message rawData", message.rawData);

        const session = await adaptSession(bot, payload);
        if (session.length)
          session.forEach(bot.dispatch.bind(bot))
        bot.logger.debug('handling bot: %s', bot.sid)
        bot.logger.debug(JSON.stringify(session))
      };

      bot.internal.on("message_create", onEventEmit);
      bot.internal.on("message_reaction", onEventEmit);
      bot.internal.on("chat_removed", onEventEmit);
      bot.internal.on("group_admin_changed", onEventEmit);
      bot.internal.on("group_join", onEventEmit);
      bot.internal.on("group_leave", onEventEmit);
      bot.internal.on("group_update", onEventEmit);
      
      bot.logger.info("Client is ready!");

      return Promise.resolve();
    });
  }

  disconnect(bot: WhatsAppBot<C>): Promise<void> {
    bot.internal.destroy();

    bot.logger.info("WhatsApp adapter is disconnected.");
    return Promise.resolve();
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
