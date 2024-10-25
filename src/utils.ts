import { Session, h, Universal, base64ToArrayBuffer, is } from "koishi";
import {} from "@cordisjs/plugin-server";
import WhatsAppBot from "./bot";
import * as WhatsAppWeb from "whatsapp-web.js";
import { MessageRawData } from "./types";

export async function adaptSession(
  bot: WhatsAppBot,
  input: WhatsAppWeb.Message | WhatsAppWeb.GroupNotification | WhatsAppWeb.Chat
) {
  const result: Session[] = [];
  bot.dispatch(
    bot.session({
      type: "internal",
      _type:
        "whatsapp-web/" +
        (isInstanceOfMessage(input) ? "message" : isInstanceOfGroupNotification(input) ? "GroupNotification" : "chat"),
      _data: isInstanceOfMessage(input) ? input.rawData : input,
    })
  );
  const session = bot.session();
  session.setInternal(bot.platform, input);
  if (isInstanceOfMessage(input)) {
    session.type = "message";
    session.event.message = await decodeMessage(input);
    session.event.channel = await decodeChannel(input);
    session.event.user = await decodeUser(input);
    session.guildId = input.id.remote;
  } else if (isInstanceOfGroupNotification(input)) {
    session.type = {
      add: "guild-member-added",
      remove: "guild-member-removed",
      leave: "guild-member-removed",
      subject: "guild-updated",
    }[input.type];

    session.guildId = (input.id as WhatsAppWeb.MessageId).remote;
    session.operatorId = input.author;

    if (session.type === "guild-updated") {
      session.event.channel = await decodeChannel(input);
      session.event.guild = await decodeGuild(input);
    } else {
      session.event.user = await decodeUser(input);
    }
  } else if (isInstanceOfChat(input)) {
    session.type = "guild-removed";
    session.guildId = (input.id as unknown as WhatsAppWeb.MessageId).remote;
  }

  session.timestamp = input.timestamp * 1000;
  result.push(session);
  return result;
}

export async function decodeMessage(message: WhatsAppWeb.Message): Promise<Universal.Message> {
  const rawData = message.rawData as MessageRawData;
  const result: Universal.Message = {};

  result.id = result.messageId = message.id.id;
  result.user = await decodeUser(message);

  if (message.hasQuotedMsg) {
    const quotedMsg = await message.getQuotedMessage();
    result.quote = await decodeMessage(quotedMsg);
  }

  if (message.type === WhatsAppWeb.MessageTypes.TEXT) {
    result.elements = [h.text(message.body)];
  } else if (
    [
      WhatsAppWeb.MessageTypes.VIDEO,
      WhatsAppWeb.MessageTypes.AUDIO,
      WhatsAppWeb.MessageTypes.IMAGE,
      WhatsAppWeb.MessageTypes.DOCUMENT,
    ].includes(message.type)
  ) {
    const elements = [];
    let type = message.type as string;
    if (message.type === WhatsAppWeb.MessageTypes.DOCUMENT) type = "file";
    const media = message.downloadMedia();
    const mediaData = base64ToArrayBuffer((await media).data);
    if (message.body) elements.push(h.text(message.body));
    elements.push(h[type](mediaData, (await media).mimetype));
    result.elements = elements;
  } else if (message.type === "sticker") {
    const media = message.downloadMedia();
    const mediaData = base64ToArrayBuffer((await media).data);
    result.elements = [
      h(
        "face",
        {
          id: message.mediaKey,
          platform: "whatsapp",
        },
        [h.image(mediaData, (await media).mimetype)]
      ),
    ];
  } else if (message.type === "location") {
    result.elements = [
      h("whatsapp:location", {
        latitude: message.location.latitude,
        longitude: message.location.longitude,
      }),
    ];
  }
  result.content = result.elements.join("");
  return result;
}

export async function decodeGuild(input: WhatsAppWeb.GroupNotification | WhatsAppWeb.Message) {
  const chat = await input.getChat();
  const result: Universal.Guild = {
    id: (input.id as WhatsAppWeb.MessageId).id,
    name: chat.name,
  };
  return result;
}

export async function decodeUser<
  T extends WhatsAppWeb.Message | WhatsAppWeb.GroupNotification,
  R = T extends WhatsAppWeb.Message ? Universal.User : Universal.User[]
>(input: T): Promise<R> {
  if (isInstanceOfMessage(input)) {
    const rawData = input.rawData as MessageRawData;
    const result: Universal.User = {
      id: input.author ? input.author : input.from,
      name: rawData.notifyName,
    };
    return result as R;
  } else if (isInstanceOfGroupNotification(input)) {
    const results: Universal.User[] = [];
    const recipients = await input.getRecipients();
    for (const recipient of recipients) {
      results.push({
        id: recipient.id._serialized,
        name: recipient.name,
      });
    }
    return results as R;
  }
}

export const decodeChannel = async (input: WhatsAppWeb.Message | WhatsAppWeb.GroupNotification | WhatsAppWeb.Chat) => {
  if (isInstanceOfMessage(input)) {
    const result: Universal.Channel = {
      id: input.id.remote,
      type: input.author ? Universal.Channel.Type.TEXT : Universal.Channel.Type.DIRECT,
      name: (input.rawData as MessageRawData).notifyName,
    };
    return result;
  } else if (isInstanceOfGroupNotification(input)) {
    const result: Universal.Channel = {
      id: (input.id as WhatsAppWeb.MessageId).remote,
      type: Universal.Channel.Type.TEXT,
      name: (await input.getChat()).name,
    };
    return result;
  } else if (isInstanceOfChat(input)) {
    const result: Universal.Channel = {
      id: (input.id as unknown as WhatsAppWeb.MessageId).remote,
      type: Universal.Channel.Type.TEXT,
      name: input.name,
    };
    return result;
  }
};

function isInstanceOfMessage(input: any): input is WhatsAppWeb.Message {
  return "rawData" in input;
}

function isInstanceOfGroupNotification(input: any): input is WhatsAppWeb.GroupNotification {
  return "recipientIds" in input;
}

function isInstanceOfChat(input: any): input is WhatsAppWeb.Chat {
  return "archived" in input;
}
