import { Bot, Context, h, Universal, Schema } from "koishi";
import WhatsAppAdapter from "./adapter";
import * as WhatsAppWeb from "whatsapp-web.js";
import { WhatsAppMessageEncoder } from "./message";
import path from "path";
import { decodeChannel, decodeGuild, decodeMessage, decodeUser, } from "./utils";
import {} from '@koishijs/plugin-console'
import { Launcher } from ".";
import { ConsoleMessage } from "./types";
import EventEmitter from "events";

export class WhatsAppBot<C extends Context = Context> extends Bot<C> {
  internal: WhatsAppWeb.Client;
  static MessageEncoder = WhatsAppMessageEncoder;

  consoleMessage: ConsoleMessage = Object.create(null);
  event: EventEmitter = new EventEmitter();

  constructor(ctx: C, config: WhatsAppBot.Config) {
    super(ctx, config, "whatsapp-web");
    this.logger.level = 3;

    this.internal = new WhatsAppWeb.Client({
      authStrategy: new WhatsAppWeb.LocalAuth({
        dataPath: path.join(ctx.baseDir, "data", config.authSessionLocation),
      }),
    });

    ctx.plugin(WhatsAppAdapter, this);
    ctx.plugin(Launcher, this);

    return this;
  }

  async stop() {
    await this.internal.destroy();
    await super.stop();
  }

  async getLogin() {
    try {
      this.selfId = this.internal.info.wid._serialized;
      this.config.selfId = this.selfId;
      this.user.name = this.internal.info.pushname;
      this.user.avatar = await (await this.internal.getContactById(this.selfId)).getProfilePicUrl();
      return this.toJSON();
    } catch (e) {
      this.logger.error("Failed to initialize bot", e);
      this.consoleMessage = { status: "error", message: "Failed to initialize bot" };
      this.event.emit("consoleMessage");
    }
  }

  async getUser(userId: string, guildId?: string): Promise<Universal.User> {
    const user = await this.internal.getContactById(userId);
    return decodeUser(user);
  }

  async getGuildList(next?: string): Promise<Universal.List<Universal.Guild>> {
    const guilds = await this.internal.getChats();
    const decodedGuilds = await Promise.all(guilds.map(decodeGuild));
    return { data: decodedGuilds };
  }

  async getGuild(guildId: string) {
    const guild = await this.internal.getChatById(guildId);
    return decodeGuild(guild);
  }

  async getGuildMemberList(guildId: string, next?: string): Promise<Universal.List<Universal.GuildMember>> {
    const participants = ((await this.internal.getChatById(guildId)) as WhatsAppWeb.GroupChat).participants;
    const contacts = participants.map(async (member) => await this.internal.getContactById(member.id._serialized));
    return { data: (await Promise.all(contacts)).map(decodeUser) as Universal.GuildMember[] };
  }

  async getGuildMember(guildId: string, userId: string): Promise<Universal.GuildMember> {
    const participants = ((await this.internal.getChatById(guildId)) as WhatsAppWeb.GroupChat).participants;
    const participant = participants.find((member) => member.id._serialized === userId);
    const contact = await this.internal.getContactById(participant.id._serialized);
    return decodeUser(contact) as Universal.GuildMember;
  }

  async kickGuildMember(guildId: string, userId: string) {
    const chat = (await this.internal.getChatById(guildId)) as WhatsAppWeb.GroupChat;
    await chat.removeParticipants([userId]);
  }
  async getChannel(channelId: string): Promise<Universal.Channel> {
    const channel = await this.internal.getChatById(channelId);
    return decodeChannel(channel);
  }

  async createReaction(channelId: string, messageId: string, emoji: string) {}

  async deleteReaction(channelId: string, messageId: string, emoji: string) {}

  async getMessage(channelId: string, messageId: string): Promise<Universal.Message> {
    const chat = await this.internal.getChatById(channelId);
    const messages = await chat.fetchMessages({ limit: 0 });
    const message = messages.find((m) => m.id.id === messageId);
    return decodeMessage(message);
  }

  async deleteMessage(channelId: string, messageId: string) {
    const chat = await this.internal.getChatById(channelId);
    const messages = await chat.fetchMessages({ limit: 0 });
    const message = messages.find((m) => m.id.id === messageId);
    await message.delete(true);
  }
}

export namespace WhatsAppBot {
  export interface Config {
    authSessionLocation?: string;
    selfId?: string;
  }
  export const Config: Schema<Config> = Schema.object({
    authSessionLocation: Schema.string()
      .description("登入信息存放位置名称，存放在data下")
      .default("adapter-whatsapp-web"),
    selfId: Schema.string().description("自身ID").hidden(),
  });
}
