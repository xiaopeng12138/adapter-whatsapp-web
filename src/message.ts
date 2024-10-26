import { arrayBufferToBase64, Context, Dict, h, MessageEncoder } from "koishi";
import { WhatsAppBot } from "./bot";
import * as WhatsAppWeb from "whatsapp-web.js";
import { MessageSendContent } from "./types";

const SUPPORTED_MEDIA = [
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/amr",
  "audio/ogg",
  "audio/opus",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
  "text/plain",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/3gpp",
];

export class WhatsAppMessageEncoder<C extends Context = Context> extends MessageEncoder<C, WhatsAppBot<C>> {
  private textBuffer: string = "";
  private content: MessageSendContent = null;
  private messageOptions: WhatsAppWeb.MessageSendOptions = {};
  private quoteId: string;

  async flush(): Promise<void> {
    this.bot.logger.debug("Sending message textBuffer", this.textBuffer);

    if (!this.content) this.content = this.textBuffer;
    else this.messageOptions.caption = this.textBuffer;

    if (!this.content) return;

    this.bot.logger.debug("Sending message", this.channelId, this.content, this.messageOptions);

    if (this.quoteId) {
      this.messageOptions.quotedMessageId = this.quoteId;
      const quote = await this.getQuoteMessage(this.channelId, this.quoteId);
      if (quote) {
        await quote.reply(this.content, this.channelId, this.messageOptions);
      }
    } else {
      await this.bot.internal.sendMessage(this.channelId, this.content, this.messageOptions);
    }

    this.textBuffer = "";
    this.content = null;
    this.messageOptions = {};

    const session = this.bot.session();
    session.type = "message";
    session.messageId = this.channelId;
    session.channelId = this.channelId;
    session.guildId = this.channelId;
    session.isDirect = this.channelId.includes("@c");
    session.event.user = this.bot.user;
    session.timestamp = Date.now();
    session.app.emit(session, "send", session);
    this.results.push(session.event.message);
  }

  async getQuoteMessage(channelId: string, messageId: string): Promise<WhatsAppWeb.Message> {
    const chat = await this.bot.internal.getChatById(channelId);
    const messages = await chat.fetchMessages({ limit: 0 });
    return messages.find((m) => m.id.id === messageId);
  }

  async createMessageMedia(attrs: Dict) {
    const { filename, data, type } = await this.bot.ctx.http.file(attrs.src || attrs.url, attrs);

    if (!SUPPORTED_MEDIA.includes(type)) {
      this.bot.logger.warn(`Unsupported media type: ${type}`);
      return;
    }
    const media = new WhatsAppWeb.MessageMedia(type, arrayBufferToBase64(data), filename);
    return media;
  }

  async visit(element: h): Promise<void> {
    const { type, attrs, children } = element;
    if (type === "text") {
      this.textBuffer += attrs.content;
    } else if ((type === "image" || type === "img") && (attrs.src || attrs.url)) {
      const media = await this.createMessageMedia(attrs);
      this.content = media;
    } else if (type === "audio" && (attrs.src || attrs.url)) {
      const media = await this.createMessageMedia(attrs);
      this.content = media;
    } else if (type === "video" && (attrs.src || attrs.url)) {
      const media = await this.createMessageMedia(attrs);
      this.content = media;
    } else if (type === "file") {
      const media = await this.createMessageMedia(attrs);
      this.content = media;
    } else if (type === "face") {
      if (attrs.platform && attrs.platform !== this.bot.platform) {
        return this.render(children);
      } else {
        const media = await this.createMessageMedia(attrs);
        this.content = media;
      }
    } else if (type === "br") {
      this.textBuffer += "\n";
    } else if (type === "p") {
      if (!this.textBuffer.endsWith("\n")) this.textBuffer += "\n";
      await this.render(children);
      if (!this.textBuffer.endsWith("\n")) this.textBuffer += "\n";
    } else if (type === "a") {
      await this.render(children);
      this.textBuffer += ` (${attrs.href}) `;
    } else if (type === "at") {
      if (attrs.id) {
        this.textBuffer += `@${attrs.id}`;
        this.messageOptions.mentions.push(attrs.id);
      }
    } else if (type === "button-group") {
      await this.render(children);
    } else if (type === "message") {
      await this.flush();
      await this.render(children);
      await this.flush();
      this.quoteId = null;
    } else if (type === "quote") {
      this.quoteId = attrs.id;
    } else {
      await this.render(children);
    }
    this.bot.logger.debug("Visiting", type, attrs, children);
  }
}
