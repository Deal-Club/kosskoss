/**
 * Legal and informational content in ENGLISH — KossKoss Select (Cameroon market).
 *
 * Mirror of src/content/legal/fr.ts. The French version is authoritative: it is
 * the language that binds the company, and this translation exists so that a
 * non-French-speaking customer can read the same terms. Where the two versions
 * diverge, the French text prevails.
 *
 * WARNING: every company detail is a PLACEHOLDER (address, RCCM registration,
 * NIU, share capital, rates). See docs/LEGAL.md for the full list of items to
 * replace before going live, and have a lawyer review the text.
 *
 * Intended legal framework: Cameroonian sales and consumer-protection law and
 * the regulations applicable to cosmetic products. Precise references remain to
 * be confirmed. This corpus is a TEMPLATE and must be reviewed by a lawyer
 * before publication.
 */

import type { LegalPageMap } from "./types";
import { COMPANY } from "./fr";

/** Date of the last editorial revision of the English corpus. */
const UPDATED_AT = "2026-08-06";

/** Return address (same as the registered office in this template). */
const RETURN_ADDRESS = `${COMPANY.name}, returns department, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}`;

/** Notice placed at the top of every legal page. */
const DISCLAIMER =
  "Notice: provisional legal content for the KossKoss Select online shop (Cameroon market). The company identity, address, registration (RCCM) and NIU still have to be filled in before publication, and the text then reviewed by a lawyer — only on that condition is it fit for use. This English version is a translation for information; the French text is the binding one.";

/** Builds the lead paragraph: notice followed by the introduction. */
function intro(lead: string): string {
  return `${DISCLAIMER}\n\n${lead}`;
}

export const enLegalPages: LegalPageMap = {
  /* ------------------------------------------------------------------ */
  /* Legal notice                                                        */
  /* ------------------------------------------------------------------ */
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Legal notice",
    intro: intro(
      "Information about the site publisher and its hosting, made available to the public in accordance with the applicable Cameroonian regulations on electronic commerce.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Publisher",
        body: "This online shop is published by:",
        list: [
          COMPANY.name,
          `${COMPANY.legalForm} with share capital of ${COMPANY.capital}`,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
        ],
      },
      {
        heading: "Legal representative and publication director",
        body: `Legal representative: ${COMPANY.managingDirector}\n\nThe legal representative acts as publication director for the site.`,
      },
      {
        heading: "Contact us",
        body: "You can reach us directly through the channels below. Our customer service is available Monday to Saturday, as well as on WhatsApp.",
        list: [
          `Phone / WhatsApp: ${COMPANY.phone}`,
          `Email: ${COMPANY.email}`,
          `Contact form: ${COMPANY.domain}/en/contact`,
        ],
      },
      {
        heading: "Company registration",
        body: `Registration with the trade and personal property credit register (RCCM): ${COMPANY.register}.\n\nUnique identification number (NIU): ${COMPANY.vatId}.\n\nThis information is to be completed from the company's registration documents before going live.`,
      },
      {
        heading: "Taxes",
        body: "The prices shown in the shop are stated in CFA francs (FCFA), all taxes included. Value added tax is applied in accordance with the Cameroonian tax regulations in force; its rate and amount appear on the invoice.",
      },
      {
        heading: "Hosting",
        body: `The site is hosted by:\n\n${COMPANY.host}`,
      },
      {
        heading: "Liability for content",
        body: "We take the greatest care over the accuracy of the information published on this site. Errors or omissions may nonetheless remain, in particular regarding product characteristics and stated lead times. Such information is indicative and subject to change; it cannot engage our liability beyond what the applicable mandatory legal provisions require.",
      },
      {
        heading: "Links to third-party sites",
        body: "This site may contain links to sites published by third parties whose content we do not control. Each publisher remains solely responsible for its own site. We remove without delay any link reported to us as problematic.",
      },
      {
        heading: "Intellectual property",
        body: "The content of this site — text, photographs, illustrations, graphic elements, structure and code — is protected under intellectual property law. Any reproduction, representation, adaptation or exploitation, in whole or in part, without prior written authorisation is prohibited, save for uses expressly permitted by law. Manufacturers' trade marks and logos remain the property of their respective owners.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Terms and conditions                                                */
  /* ------------------------------------------------------------------ */
  cgv: {
    slug: "cgv",
    title: "Terms and conditions of sale",
    intro: intro(
      "These general terms govern sales concluded on the KossKoss Select online shop. They form the framework of the commercial relationship between the seller and the customer.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "1. Scope",
        body: `These terms and conditions of sale apply to every order placed on ${COMPANY.domain} with ${COMPANY.name}. They are binding on the customer, who acknowledges having read and accepted them before validating an order.\n\nAny conflicting condition put forward by the customer is unenforceable unless we accept it in writing.`,
      },
      {
        heading: "2. Products and availability",
        body: "The products on offer are cosmetic and skincare products, presented with their essential characteristics on each product page. They are available while stocks last. Photographs are indicative: the shade, packaging or format of an item may vary slightly according to the manufacturer's batches, without this constituting a defect.\n\nShould an item become unavailable after the order, we will inform you without delay and refund in full the sums paid for the missing item.",
      },
      {
        heading: "3. Prices",
        body: "Prices are stated in CFA francs (FCFA), all taxes included. Delivery costs are shown separately before the order is validated. The total price payable is displayed legibly on the summary page before payment.\n\nWe reserve the right to change our prices at any time. The applicable price is the one displayed when the order is validated.",
      },
      {
        heading: "4. Placing an order",
        body: "An order goes through three steps: contact details and delivery address, choice of payment method, then review and confirmation. You can correct your details at each step before the final confirmation.\n\nClicking the payment button constitutes firm acceptance of the order and of these terms. We acknowledge receipt of the order by email. Delivery is then coordinated with you, in particular by WhatsApp.",
      },
      {
        heading: "5. Payment",
        body: "The payment methods accepted are listed on the “Payment methods” page and during checkout: Mobile Money (Orange Money, MTN Mobile Money), bank card and, depending on the area, cash on delivery. Payment data is processed by our payment provider over an encrypted connection and is never stored on our servers.",
      },
      {
        heading: "6. Delivery",
        body: `We deliver within Cameroon. The towns served, lead times and rates are set out on the “Delivery” page. Delivery is arranged together with you, usually by phone or WhatsApp, so as to agree the place and time of handover.\n\nRisk relating to the product passes to the customer when the parcel is physically handed over.`,
      },
      {
        heading: "7. Withdrawal and returns",
        body: `You have fourteen days to change your mind about an unopened item still in its sealed original packaging. For reasons of hygiene and health safety, cosmetic products that have been unsealed or started cannot be taken back. The full terms are on the “Right of withdrawal” page.\n\nReturn address: ${RETURN_ADDRESS}.`,
      },
      {
        heading: "8. Conformity and defective products",
        body: "We are required to deliver a product that conforms to its description and is fit for its intended use. If an item reaches you damaged, expired or not matching your order, contact us: we will replace or refund it in accordance with the terms on the “Returns & complaints” page.",
      },
      {
        heading: "9. Product authenticity",
        body: "KossKoss Select undertakes to sell only authentic products sourced through identified supply channels. Each product page states the brand and, where the information is available, the volume and the period-after-opening or best-before date.",
      },
      {
        heading: "10. Personal data",
        body: "The processing of personal data collected when an order is placed is described on the “Privacy policy” page. Data strictly necessary for the performance of the contract and for the retention of accounting records is kept for the statutory periods.",
      },
      {
        heading: "11. Complaints",
        body: `Any complaint should first be sent to our customer service, by email to ${COMPANY.email}, by phone or on WhatsApp at ${COMPANY.phone}. We endeavour to reply as quickly as possible and to reach an amicable solution.`,
      },
      {
        heading: "12. Governing law",
        body: "These terms are governed by Cameroonian law. In the event of a dispute, the parties will seek an amicable solution before any action; failing that, the competent courts in Cameroon will be seised in accordance with the applicable rules.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Privacy policy                                                      */
  /* ------------------------------------------------------------------ */
  confidentialite: {
    slug: "confidentialite",
    title: "Privacy policy",
    intro: intro(
      "Information on the processing of your personal data, in compliance with the applicable Cameroonian regulations on the protection of personal data.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Data controller",
        body: "The controller of your data is:",
        list: [
          COMPANY.name,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
          `Email: ${COMPANY.email}`,
          `Phone / WhatsApp: ${COMPANY.phone}`,
        ],
      },
      {
        heading: "Data processed when you order",
        body: "To process an order we collect the following data:",
        list: [
          "First name and surname",
          "Delivery address",
          "Email address",
          "Phone number, needed to arrange delivery (in particular by WhatsApp)",
          "Order contents, amounts and chosen payment method",
          "Answers to the beauty diagnostic, when you choose to use it",
        ],
      },
      {
        heading: "Purposes",
        body: "Your data is used solely for the following purposes:",
        list: [
          "Fulfilling the order, delivery and after-sales service",
          "Meeting our accounting and tax obligations",
          "Product recommendations from the beauty diagnostic, with your agreement",
          "Sending marketing communications where you have consented, revocable at any time",
        ],
      },
      {
        heading: "Customer account",
        body: "Creating an account is optional: ordering as a guest remains possible. The password is stored as a non-reversible hash and is never readable, including by our own team.",
      },
      {
        heading: "Recipients",
        body: "Your data is disclosed only to recipients necessary for performing the contract:",
        list: [
          "The delivery agent or carrier, for transport of the parcel",
          "The payment provider, for collection (Mobile Money, card)",
          "Technical providers (hosting, email delivery), acting as processors",
        ],
      },
      {
        heading: "Retention periods",
        body: "We keep your data only as long as necessary:",
        list: [
          "Order data and invoices: for the applicable accounting and tax retention periods",
          "Customer account: until you delete it, then erased within a reasonable time",
          "Marketing recipients: until you withdraw your consent",
        ],
      },
      {
        heading: "Cookies and trackers",
        body: "The site uses only cookies strictly necessary for it to work: sign-in session, cart and language preference. No third-party analytics, advertising or social media cookie is set without your prior consent.",
      },
      {
        heading: "Your rights",
        body: "Under the conditions laid down by the applicable regulations, you have the following rights:",
        list: [
          "Right of access to your data",
          "Right to rectification",
          "Right to erasure",
          "Right to object, in particular to marketing",
          "Right to withdraw your consent at any time",
        ],
      },
      {
        heading: "Exercising your rights",
        body: `Send your request to ${COMPANY.email}. From your customer account you can also export your data and delete your account without going through us.`,
      },
      {
        heading: "Limits to erasure",
        body: "Deleting an account does not delete orders already fulfilled: invoices and accounting records are subject to the statutory retention periods. Orders are then detached from the account and any contact details not required on the invoice are removed from them.",
      },
      {
        heading: "Security",
        body: "Traffic with the site is encrypted (TLS). Access to data is limited to those who need it, back-office authentication requires a second factor, and technical secrets are protected at rest.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Right of withdrawal                                                 */
  /* ------------------------------------------------------------------ */
  retractation: {
    slug: "retractation",
    title: "Right of withdrawal",
    intro: intro(
      "The conditions under which you can change your mind after an order, and the limits specific to cosmetic products for reasons of hygiene.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Time to change your mind",
        body: "You can change your mind about an item within fourteen days of receiving your order, without having to give a reason, provided the item is returned unopened and in its sealed original packaging.",
      },
      {
        heading: "Products excluded for reasons of hygiene",
        body: "For reasons of hygiene and health protection, cosmetic and skincare products that have been unsealed, opened or started after delivery cannot be taken back or exchanged. This exclusion is standard for this type of product and is intended to protect your safety and that of other customers.",
      },
      {
        heading: "How to exercise this right",
        body: `To exercise your right, notify us of your decision by a clear statement — email, phone or WhatsApp message — quoting your order number.\n\nSend your notification to:\n\n${COMPANY.name}\n${COMPANY.street}\n${COMPANY.city}\n${COMPANY.country}\nEmail: ${COMPANY.email}\nPhone / WhatsApp: ${COMPANY.phone}`,
      },
      {
        heading: "Sending the items back",
        body: `You must send back or return the items concerned without undue delay after telling us of your decision.\n\nReturn address: ${RETURN_ADDRESS}.\n\nThe direct cost of returning the items is yours, except where the return follows a non-conforming, damaged or expired item, in which case we bear it.`,
      },
      {
        heading: "Refund",
        body: "Where a return is accepted, we refund the corresponding sums using the same means of payment as the order, unless you agree to another means (for example a Mobile Money refund). The refund is made after the returned item has been received and checked.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Delivery                                                            */
  /* ------------------------------------------------------------------ */
  livraison: {
    slug: "livraison",
    title: "Delivery",
    intro: intro(
      "Towns served, lead times, rates and how handover is arranged. This information is provided before the order is validated.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Delivery area",
        body: "We deliver within Cameroon. The main cities are served quickly; the rest of the country is delivered by a partner carrier.",
        list: [
          "Douala and Yaoundé: fast delivery, usually within 24 to 72 hours",
          "Other towns: delivery by carrier, lead time depending on the destination",
        ],
      },
      {
        heading: "Rates",
        body: "Delivery costs depend on the destination town and are shown before the order is validated. Free-delivery offers may be run from time to time; they are then clearly indicated in the cart.",
      },
      {
        heading: "Arranging handover",
        body: `After the order, we contact you — usually by WhatsApp at ${COMPANY.phone} — to agree the place and time to hand over the parcel. Keep your phone reachable: that is the simplest way to coordinate delivery.`,
      },
      {
        heading: "Receiving the order",
        body: "On receipt, check that the parcel is properly sealed and that the items match your order. Tell us immediately about any missing, damaged or non-conforming item so we can deal with it quickly.",
      },
      {
        heading: "Transfer of risk",
        body: "The risk of loss or damage to the items passes to you when you take physical possession of the parcel.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Payment methods                                                     */
  /* ------------------------------------------------------------------ */
  "moyens-de-paiement": {
    slug: "moyens-de-paiement",
    title: "Payment methods",
    intro: intro(
      "Payment methods accepted, transaction security and invoicing. The methods actually available are those shown during checkout.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Methods accepted",
        body: "The available payment methods are shown at the “Payment” step of checkout. Depending on the current configuration, they may include:",
        list: [
          "Mobile Money — Orange Money",
          "Mobile Money — MTN Mobile Money",
          "Bank card (Visa, Mastercard)",
          "Cash on delivery, depending on the area and to be stated when ordering",
        ],
      },
      {
        heading: "Transaction security",
        body: "Online payments are processed by a specialist payment provider over an encrypted connection. Payment data never passes through our servers in the clear and is never stored there.",
      },
      {
        heading: "Mobile Money payment",
        body: "Payment by Mobile Money is made from your Orange Money or MTN Mobile Money account. You confirm the transaction directly on your phone; confirmation reaches us automatically and triggers preparation of the order.",
      },
      {
        heading: "Cash on delivery",
        body: "Where cash on delivery is offered for your area, it must be stated when ordering. Please have the exact amount ready where possible, to make handover easier.",
      },
      {
        heading: "Invoice",
        body: "An invoice is associated with every order and referenced in the confirmation email. Customers with an account can find their orders and invoices at any time under “My orders”.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Returns & complaints                                                */
  /* ------------------------------------------------------------------ */
  retours: {
    slug: "retours",
    title: "Returns & complaints",
    intro: intro(
      "What to do if an item is non-conforming, damaged or expired, and a reminder of the limits specific to cosmetic products.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Two distinct situations",
        body: "A return may fall under two different cases, which do not confer the same rights:",
        list: [
          "Changing your mind: possible within fourteen days, only for an unopened, sealed item. Return costs are yours. See the “Right of withdrawal” page.",
          "A non-conforming, damaged or expired item: return costs and replacement or refund are ours.",
        ],
      },
      {
        heading: "Non-conforming or defective item",
        body: "If an item reaches you damaged, expired, not matching your order or visibly altered, we will arrange its replacement or refund. Contact us as soon as you receive it, if possible with a photograph of the item and its packaging.",
      },
      {
        heading: "Hygiene of cosmetic products",
        body: "For reasons of hygiene and safety, a cosmetic product that has been unsealed or started cannot be taken back merely because you have changed your mind. This limit does not apply where the fault is ours (damaged, expired or non-conforming item).",
      },
      {
        heading: "Opening a complaint",
        body: `Write to ${COMPANY.email} or contact us on WhatsApp at ${COMPANY.phone}, quoting the order number, the nature of the problem and, if possible, photographs. We tell you how to proceed before anything is sent back.`,
      },
      {
        heading: "Return address",
        body: RETURN_ADDRESS,
      },
      {
        heading: "Refund",
        body: "The refund is made using the same means of payment as the order, unless you agree to another means (for example Mobile Money), after the returned item has been received and checked.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* FAQ                                                                 */
  /* ------------------------------------------------------------------ */
  faq: {
    slug: "faq",
    title: "Frequently asked questions",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Are the products authentic?",
        body: "Yes. KossKoss Select sells only authentic products sourced through identified supply channels. Each product page states the brand and, where the information is available, the volume and the best-before date.",
      },
      {
        heading: "How does the beauty diagnostic work?",
        body: "The beauty diagnostic asks you a few simple questions about your skin type, your preferences and your goals, then suggests a selection of suitable products. It is free, with no obligation, and you remain free to follow the recommendations or not.",
      },
      {
        heading: "How do I pay for my order?",
        body: "You can pay by Mobile Money (Orange Money, MTN Mobile Money) or by bank card. Cash on delivery is offered depending on your area. The payment method is chosen at the “Payment” step; the final total is shown before confirmation.",
      },
      {
        heading: "Where and how quickly do you deliver?",
        body: "We deliver within Cameroon. Douala and Yaoundé are usually delivered within 24 to 72 hours; other towns are served by carrier, with a lead time depending on the destination. Costs are shown before the order is validated.",
      },
      {
        heading: "How does delivery work in practice?",
        body: "After your order, we contact you — usually by WhatsApp — to agree the place and time of handover. Keep your phone reachable: it is the simplest way to coordinate delivery.",
      },
      {
        heading: "Can I return a product?",
        body: "You can change your mind within fourteen days about an unopened, sealed item. For reasons of hygiene, a cosmetic product that has been unsealed or started cannot be taken back, unless it reached you damaged, expired or non-conforming: in that case we replace or refund it.",
      },
      {
        heading: "Do I have to create an account to order?",
        body: "No. Ordering as a guest is possible and an account remains optional. Creating an account simply saves you retyping your details and gives you access to your order history.",
      },
      {
        heading: "How should I store my products?",
        body: "Keep your cosmetics away from heat and direct light, well closed after use. Respect the best-before date and, where applicable, the period after opening shown on the packaging (for example “12M” for twelve months after opening).",
      },
      {
        heading: "How do I track my order?",
        body: "After your order, you receive a confirmation by email. We keep you informed of progress, in particular by WhatsApp. If you have an account, the “My orders” section shows the same status.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* About                                                               */
  /* ------------------------------------------------------------------ */
  "a-propos": {
    slug: "a-propos",
    title: "About KossKoss Select",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "What we offer",
        body: "KossKoss Select is an online shop for cosmetics and skincare products, designed for Cameroon. We bring together several brands, from face care to body, hair and hygiene, and we help you choose thanks to a simple beauty diagnostic.",
      },
      {
        heading: "Authentic products",
        body: "We sell only authentic products, sourced through identified supply channels. Our selection favours clear formulas and recognised brands, so that you know what you are putting on your skin.",
      },
      {
        heading: "The beauty diagnostic",
        body: "Choosing a skincare product is not always easy. Our beauty diagnostic asks you a few questions about your skin, your preferences and your goals, then points you towards a suitable selection. Free and with no obligation, it is there to make the decision simpler, not to take it for you.",
      },
      {
        heading: "Local delivery",
        body: `We deliver within Cameroon and coordinate every delivery with you, usually by WhatsApp. Douala and Yaoundé are delivered quickly; the rest of the country is served by carrier. A question before you buy? Write to us, and a real person will answer.`,
      },
      {
        heading: "Reaching us",
        body: `Our customer service is available by phone and on WhatsApp at ${COMPANY.phone}, as well as by email at ${COMPANY.email}.`,
      },
      {
        heading: "Company details",
        body: `${COMPANY.name}, ${COMPANY.legalForm} with share capital of ${COMPANY.capital}, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}. ${COMPANY.register}. NIU: ${COMPANY.vatId}. Full details are in the legal notice.`,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Contact                                                             */
  /* ------------------------------------------------------------------ */
  contact: {
    slug: "contact",
    title: "Contact",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Customer service",
        body: "For any question about an order, a lead time or a product, we are available Monday to Saturday, by phone, on WhatsApp and by email.",
        list: [
          `Phone / WhatsApp: ${COMPANY.phone}`,
          `Email: ${COMPANY.email}`,
          `Form: ${COMPANY.domain}/en/contact`,
        ],
      },
      {
        heading: "Postal address",
        body: `${COMPANY.name}\n${COMPANY.street}\n${COMPANY.city}\n${COMPANY.country}`,
      },
      {
        heading: "Order tracking",
        body: "After your order, you receive a confirmation by email and we keep you informed, in particular by WhatsApp. If you have an account, the “My orders” section shows the status. Keep the order number to hand: it speeds up any exchange.",
      },
      {
        heading: "Complaints",
        body: `Send your complaint to ${COMPANY.email} or by WhatsApp at ${COMPANY.phone}, quoting the order number and, if possible, photographs. The detailed procedure is on the “Returns & complaints” page.`,
      },
      {
        heading: "Data protection",
        body: `Requests to access, rectify or erase your data go to ${COMPANY.email}. From your account you can also export your data and delete your account.`,
      },
      {
        heading: "Partnerships",
        body: `Partnership proposals or requests to feature brands should be sent to ${COMPANY.email} with the subject “Partnership”.`,
      },
      {
        heading: "Company details",
        body: `${COMPANY.name}, represented by ${COMPANY.managingDirector}. ${COMPANY.register}. NIU: ${COMPANY.vatId}. Full details are in the legal notice.`,
      },
    ],
  },
};
