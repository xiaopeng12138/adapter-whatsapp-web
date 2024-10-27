import WhatsAppAdapter from "./adapter";
import { WhatsAppBot } from "./bot";
import { DataService } from "@koishijs/plugin-console";
import { Context} from "koishi";
import { resolve } from "path";
import { ConsoleMessage } from "./types";

export { WhatsAppAdapter, WhatsAppBot };

export * from "./adapter";
export * from "./bot";

declare module "@koishijs/plugin-console" {
  namespace Console {
    interface Services {
      WhatsAppWeb: Launcher;
    }
  }
}

export class Launcher extends DataService<ConsoleMessage> {
  private bot: WhatsAppBot;
  constructor(ctx: Context, bot: WhatsAppBot) {
    super(ctx, "WhatsAppWeb");
    this.bot = bot;
    ctx.inject(['console'], (ctx) => {
        ctx.console.addEntry({
          dev: resolve(__dirname, '../client/index.ts'),
          prod: resolve(__dirname, '../dist'),
        })
      })
    bot.event.on("consoleMessage", this.refresh.bind(this));
    bot.logger.info("Launcher initialized Constructor");
  }

  async get() {
    this.bot.logger.debug("Initializing WhatsApp Web Adapter", this.bot.consoleMessage);
    return this.bot.consoleMessage;
  }
}

export default WhatsAppBot;
