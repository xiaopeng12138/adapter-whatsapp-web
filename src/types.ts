import * as WhatsAppWeb from "whatsapp-web.js";

export interface MessageRawData {
  notifyName?: string;
}
export type MessageSendContent =
  | string
  | WhatsAppWeb.MessageMedia
  | WhatsAppWeb.Location
  | WhatsAppWeb.Poll
  | WhatsAppWeb.Contact
  | WhatsAppWeb.Contact[]
  | WhatsAppWeb.Buttons
  | WhatsAppWeb.List;

export interface ConsoleMessage {
  status: ConsoleMessage.Status;
  image?: string;
  message?: string;
}

export namespace ConsoleMessage {
  export type Status = "error" | "offline" | "success" | "continue" | "init" | "qrcode";
}
