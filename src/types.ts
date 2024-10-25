import * as WhatsAppWeb from "whatsapp-web.js";

export interface MessageRawData {
    notifyName?: string;
}
export type MessageSendContent = string | WhatsAppWeb.MessageMedia | WhatsAppWeb.Location | WhatsAppWeb.Poll | WhatsAppWeb.Contact | WhatsAppWeb.Contact[] | WhatsAppWeb.Buttons | WhatsAppWeb.List;