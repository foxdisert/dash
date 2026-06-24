/** Seed templates. Plain text with {{variables}}; emails wrap this in HTML. */
export type DefaultTemplate = {
  key: string;
  name: string;
  channel: "both" | "email" | "whatsapp";
  subject: string;
  body: string;
};

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: "expiry_reminder",
    name: "Renewal reminder",
    channel: "both",
    subject: "⏳ Your {{business_name}} plan expires {{expiry_phrase}}",
    body: `Hi {{name}},

Just a friendly reminder that your subscription expires on {{expiry_date}} ({{expiry_phrase}}).

To keep everything running without any interruption, I can send over the renewal details whenever you're ready — just reply to this message and I'll take care of it for you.

Thanks for being with {{business_name}}!
{{from_name}}`,
  },
  {
    key: "welcome",
    name: "Welcome / device question",
    channel: "both",
    subject: "🎉 Welcome to {{business_name}} — quick setup question",
    body: `Hi {{name}},

Thank you for your order — welcome aboard! 🎉

To get you set up quickly, could you let me know:
1) Which device will you be watching on? (Smart TV, Firestick, Android box, phone…)
2) Do you already have an IPTV app installed?

As soon as I know, I'll send you the exact steps to start watching.

Talk soon,
{{from_name}} — {{business_name}}`,
  },
  {
    key: "installation",
    name: "Installation guide",
    channel: "both",
    subject: "📺 How to install your {{business_name}} app",
    body: `Hi {{name}},

Thanks again for your order! Here's how to get set up:

• If you have the "Downloader" app, enter this code to install our app: {{downloader_code}}
• Once it's installed, open it and send me your Device ID and Device Key — I'll activate your line right away.

Prefer a guided walkthrough?
• Step-by-step guide: {{installation_url}}
• Live help on WhatsApp: {{whatsapp_number}}

Looking forward to getting you up and running!
{{from_name}} — {{business_name}}`,
  },
  {
    key: "trial_followup",
    name: "Trial follow-up",
    channel: "both",
    subject: "🎬 How's your {{business_name}} trial going?",
    body: `Hi {{name}},

I'm just checking in on your trial — I want to make sure you're getting smooth, high-quality streams.

How has it been so far? Any buffering, or channels you'd like added?

If you're enjoying it, I'd be happy to share our current subscription offers whenever you're ready — just say the word.

Thanks for testing with us!
{{from_name}} — {{business_name}}`,
  },
  {
    key: "payment_details",
    name: "Payment / renewal details",
    channel: "both",
    subject: "💳 Your {{business_name}} renewal details",
    body: `Hi {{name}},

Here are the details to renew your subscription:

{{payment_details}}

Once payment is done, just send me a quick confirmation and I'll extend your line immediately.

Thanks!
{{from_name}} — {{business_name}}`,
  },
];
