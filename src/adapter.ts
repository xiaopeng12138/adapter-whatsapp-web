import { Adapter, Context, Logger, Schema } from "koishi";
import { } from "@cordisjs/plugin-server";
import {WhatsAppBot} from "./bot";
import * as WhatsAppWeb from "whatsapp-web.js";
import { adaptSession,} from "./utils";
import QRCode from 'qrcode'

class WhatsAppAdapter<C extends Context = Context> extends Adapter<C, WhatsAppBot<C>> {

  async connect(bot: WhatsAppBot<C>){

    this.ctx.on("ready", async () => {
      bot.logger.info("Adapter is ready.");
      bot.logger.info("Client start initializing...");
      bot.consoleMessage = { status: "init", message: "Initializing WhatsApp Web Client" };
      bot.event.emit("consoleMessage");
      bot.internal.initialize();
    });

    bot.internal.on("qr", async (qrData) => {
      // Generate and scan this code with your phone
      bot.logger.info("QR RECEIVED", qrData);

      const qrImg = await QRCode.toDataURL(qrData);
      bot.consoleMessage = { status: "qrcode", image: qrImg, message: "Scan the QR code with your WhatsApp" };
      bot.event.emit("consoleMessage");
    });

    bot.internal.on("ready", async () => {
      bot.logger.debug("Client is ready!", bot.internal.info);

      bot.consoleMessage = { status: "success", message: "WhatsApp Web Client is ready" };
      bot.event.emit("consoleMessage");

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

    bot.internal.on("disconnected", (reason) => {
      bot.logger.error("Client was disconnected!", reason);
      bot.consoleMessage = { status: "offline", message: "WhatsApp Web Client was disconnected" };
      bot.event.emit("consoleMessage");
      bot.offline();
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
