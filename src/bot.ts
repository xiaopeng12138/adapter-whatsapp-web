import { Bot, Context, h, Universal, Schema } from "koishi";
import WhatsAppAdapter from "./adapter";
import * as WhatsAppWeb from "whatsapp-web.js";
import { WhatsAppMessageEncoder } from "./message";

export class WhatsAppBot<C extends Context = Context> extends Bot<C> {
  public platform = "whatsapp-web";
  public internal: WhatsAppWeb.Client;

  static MessageEncoder = WhatsAppMessageEncoder;

  constructor(ctx: C, internal: WhatsAppWeb.Client) {
    super(ctx, {});
    this.internal = internal;
    this.selfId = this.internal.info.wid._serialized;
    this.user = {
      id: this.internal.info.wid._serialized,
      name: this.internal.info.pushname,
    };
  }
}

export default WhatsAppBot;
