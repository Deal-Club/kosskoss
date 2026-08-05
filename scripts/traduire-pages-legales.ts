/**
 * Traduction anglaise des pages du pied de page enregistrées en base.
 *
 * Les dix pages légales et informatives (mentions légales, CGV, confidentialité,
 * rétractation, livraison, moyens de paiement, retours, FAQ, à propos, contact)
 * ont été réécrites depuis le back-office EN FRANÇAIS SEULEMENT : la table
 * `LegalContent` ne portait que des lignes `locale = 'fr'`. Les visiteurs de
 * `/en/...` voyaient donc encore le contenu d'origine du dépôt
 * (`src/content/legal/en.ts`), qui décrit une autre boutique — d'autres zones de
 * livraison, d'autres tarifs, d'autres coordonnées.
 *
 * Ce script pose les lignes `locale = 'en'` manquantes à partir des traductions
 * ci-dessous. Le français reste la version qui engage la société ; l'anglais
 * n'est qu'une traduction de courtoisie, et c'est le texte français qui prévaut
 * en cas de divergence.
 *
 * Lancement :
 *   npx tsx --env-file=.env.local scripts/traduire-pages-legales.ts --simuler
 *   npx tsx --env-file=.env.local scripts/traduire-pages-legales.ts
 *
 * Le script est idempotent : le relancer réécrit exactement les mêmes valeurs.
 *
 * GARDE-FOU. Avant d'écrire, chaque traduction est confrontée à la page
 * française lue en base : même nombre de sections, même présence de chapeau,
 * même nombre de puces par section. Le jour où quelqu'un ajoutera une section
 * en français sans repasser ici, le script refusera d'écrire plutôt que de
 * publier une page anglaise amputée. La date de révision n'est jamais recopiée
 * à la main : elle est reprise de la page française, pour que les deux versions
 * annoncent la même révision.
 *
 * POURQUOI `pg` ET NON PRISMA. Le client Prisma généré importe
 * `@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs`, que la version
 * 7.9.0 du paquet ne publie pas : sous `tsx`, donc en ESM, toute requête échoue
 * avec ERR_MODULE_NOT_FOUND. L'application, qui passe par le bundler de Next,
 * n'est pas concernée. Un script de maintenance n'a pas à attendre la
 * correction en amont : il ouvre lui-même la connexion, sur la même
 * DATABASE_URL.
 */

import { Client } from "pg";
import { normalizeLegalPage } from "../src/server/legalPageInput";
import type { LegalPage, LegalSlug } from "../src/content/legal/types";

/** Une traduction : la page française privée de ce qui ne se traduit pas. */
interface Traduction {
  readonly title: string;
  readonly intro?: string;
  readonly sections: readonly { heading: string; body: string; list?: readonly string[] }[];
}

/**
 * Auteur inscrit dans la colonne `updatedBy`.
 * Ce n'est pas l'e-mail d'un administrateur : la ligne n'a pas été publiée
 * depuis le back-office, et la liste des pages doit le dire.
 */
const AUTEUR = process.env.LEGAL_TRANSLATION_AUTHOR ?? "scripts/traduire-pages-legales.ts";

// ---------------------------------------------------------------------------
// Traductions
//
// Conventions suivies, celles de src/content/legal/en.ts :
//  - anglais britannique ;
//  - les références au droit français gardent leur numéro d'article et nomment
//    le code en anglais (« article L221-18 of the French Consumer Code ») : un
//    lecteur anglophone doit pouvoir retrouver le texte applicable ;
//  - les guillemets sont les guillemets courbes anglais, jamais les chevrons ;
//  - les marques **gras** du texte français sont conservées : `RichText` les
//    interprète dans les deux langues ;
//  - les renvois vers une autre page reprennent son titre anglais ;
//  - le formulaire de contact pointe vers /en/contact.
// ---------------------------------------------------------------------------

const TRADUCTIONS: Readonly<Record<LegalSlug, Traduction>> = {
  "mentions-legales": {
    title: "Legal notice",
    intro:
      "Publisher information required by article 6 III of French law no. 2004-575 of 21 June 2004 on confidence in the digital economy (LCEN) and by article R123-237 of the French Commercial Code.",
    sections: [
      {
        heading: "Site publisher",
        body: "This online shop is published by:",
        list: [
          "MLC BOIS",
          "Single-shareholder simplified joint-stock company (SASU) with share capital of €30,000",
          "27 Grande Rue",
          "21700 Villebichot",
          "France",
        ],
      },
      {
        heading: "Legal representative and publication director",
        body: "President: Clément Mauroy\n\nThe president also acts as publication director within the meaning of article 6 III 2° of the LCEN.",
      },
      {
        heading: "Contact us",
        body: "You can reach us directly through the channels below. Our customer service is available Monday to Friday from 8am to 5pm and Saturday from 9am to 1pm.",
        list: [
          "Phone: +33 6 35 01 35 57 (standard rate)",
          "Email: contact@mlc-bois.fr",
          "Contact form: www.mlc-bois.fr/en/contact",
        ],
      },
      {
        heading: "Company registration",
        body: "Registration with the trade and companies register: RCS Dijon 990 527 871.\n\nSIREN number: 990 527 871\nSIRET number (registered office): 990 527 871 00018\n\nBusiness activity code (APE/NAF): 4673A (wholesale and retail of firewood, pellets and construction materials)",
      },
      {
        heading: "Intra-Community VAT number",
        body: "Individual VAT identification number: FR71990527871.\n\nFirewood for domestic use falls under the reduced 10 % rate (article 278 bis of the French General Tax Code). Supplies and services outside that regime are invoiced at the standard 20 % rate.",
      },
      {
        heading: "Consumer mediation",
        body:
          "Under articles L612-1 et seq. of the French Consumer Code, every consumer is entitled to free recourse to a consumer ombudsman with a view to the amicable settlement of a dispute with a trader.\n\n" +
          "Before referring the matter to the ombudsman, please first send a written complaint to our customer service: we find a solution in the vast majority of cases.\n\n" +
          "Competent ombudsman: name and contact details of the mediation scheme the company subscribes to (placeholder — subscribing to a mediation scheme is mandatory and must be arranged before going live).\n\n" +
          "The European online dispute resolution platform ceased operating permanently on 20 July 2025. No link to that platform may therefore appear on the site.",
      },
      {
        heading: "Liability for content",
        body: "We take the greatest care over the accuracy of the information published on this site. Errors or omissions may nonetheless remain, in particular regarding product characteristics and stated lead times. Such information is indicative and subject to change; it cannot engage our liability beyond what mandatory legal provisions — in particular those of the French Consumer Code — require.",
      },
      {
        heading: "Links to third-party sites",
        body: "This site may contain links to sites published by third parties whose content we do not control. Each publisher remains solely responsible for its own site. Linked pages were checked when the link was created and showed no unlawful content at that time. As continuous monitoring is not reasonable in the absence of concrete evidence, we remove without delay any link reported to us as problematic.",
      },
      {
        heading: "Intellectual property",
        body: "The content of this site — text, photographs, illustrations, graphic elements, structure and code — is protected by the French Intellectual Property Code. Any reproduction, representation, adaptation or exploitation, in whole or in part, without prior written authorisation is prohibited, save for uses expressly permitted by law (private copying, short quotation). Manufacturers' trade marks and logos remain the property of their respective owners.",
      },
    ],
  },

  cgv: {
    title: "Terms and conditions of sale",
    intro:
      "These general terms govern sales concluded on the MLC Bois online shop. They form the single framework of the commercial relationship within the meaning of article L441-1 of the French Commercial Code.",
    sections: [
      {
        heading: "1. Scope",
        body:
          "These terms and conditions of sale apply to every order placed on www.mlc-bois.fr with MLC BOIS. They are binding on the customer, who acknowledges having read and accepted them before confirming the order.\n\n" +
          "They address consumers, within the meaning of the preliminary article of the French Consumer Code, as well as business customers. Provisions expressly reserved for consumers — in particular the right of withdrawal — do not benefit professionals acting in the course of their business, subject to the exceptions provided by law.\n\n" +
          "Any conflicting condition put forward by the customer is unenforceable unless we accept it in writing.",
      },
      {
        heading: "2. Products and availability",
        body:
          "The products on offer are those shown on the site on the day it is consulted, while stocks last. Photographs and descriptions are indicative: wood is a natural product whose colour, bark and size vary from one batch to another without this amounting to a lack of conformity.\n\n" +
          "Volumes are expressed in loose cubic metres (mètre cube apparent, MAP) or in stères, that is the volume the wood occupies when tipped loose. One MAP is roughly 0.7 stère once stacked and roughly 0.4 cubic metre of solid wood. The customary tolerances of the trade apply.\n\n" +
          "If a product becomes unavailable after the order, we inform you without delay and refund every sum paid within fourteen days at the latest, in accordance with article L216-3 of the French Consumer Code.",
      },
      {
        heading: "3. Prices",
        body:
          "Prices are shown in euros, inclusive of all taxes. Firewood for domestic use benefits from the reduced 10 % VAT rate under article 278 bis of the French General Tax Code; other items and services are subject to the rate applicable to them.\n\n" +
          "Standard delivery is free of charge, while express delivery costs €60. Delivery charges are shown separately before the order is confirmed, in accordance with article L221-5 of the French Consumer Code. The total amount payable is displayed legibly on the summary page before payment.\n\n" +
          "We reserve the right to change our prices at any time. The applicable price is the one displayed when the order is confirmed.",
      },
      {
        heading: "4. Ordering",
        body:
          "An order goes through three steps: contact details and addresses, choice of payment method, then review and confirmation. You can correct your details at each step before the final confirmation.\n\n" +
          "Clicking the button marked “Place order with obligation to pay” constitutes firm acceptance of the order and of these terms, in accordance with article L221-14 of the French Consumer Code.\n\n" +
          "We acknowledge receipt of the order by email, on a durable medium, within a reasonable time and no later than delivery. The contract is formed only upon that acknowledgement.",
      },
      {
        heading: "5. Payment",
        body:
          "The accepted payment methods are listed on the “Payment methods” page and shown during checkout. Payment data is transmitted encrypted and is never stored on our servers.\n\n" +
          "Where payment is made by bank transfer, the order is prepared once the funds have actually been received. If a business customer pays late, penalties equal to three times the statutory interest rate together with a fixed indemnity of €40 for recovery costs are due automatically (articles L441-10 and D441-5 of the French Commercial Code).",
      },
      {
        heading: "6. Delivery",
        body:
          "We deliver in **France** and in **Belgium**; lead times and prices are set out on the “**Delivery**” page.\n\n" +
          "Delivery is made to the boundary of the property: unloading at the kerb or in the driveway is included in the price, provided a 7.5-tonne vehicle can get there. We carry pallet trucks to move the pallets to your storage area.\n\n" +
          "Where no date is stated, we deliver within the next 3 days at the latest. Should we fail to do so, you may require us to deliver within a further reasonable period, and then terminate the contract if we still do not perform.\n\n" +
          "Risk passes to the customer when they take physical possession of the goods (article L216-4 of the French Consumer Code).",
      },
      {
        heading: "7. Right of withdrawal",
        body:
          "Consumers have fourteen days to exercise their right of withdrawal without having to give a reason, under the conditions of articles L221-18 et seq. of the French Consumer Code. The full procedure and the model form appear on the “Right of withdrawal” page.\n\n" +
          "Return address: MLC BOIS, returns department, 27 Grande Rue, 21700 Villebichot, France.",
      },
      {
        heading: "8. Retention of title",
        body: "The goods delivered remain our property until the price has been paid in full. This retention of title does not affect the transfer of risk, which occurs when the goods are handed over.",
      },
      {
        heading: "9. Personal data",
        body: "The processing of personal data collected when an order is placed is described on the “Privacy policy” page. Data strictly necessary to perform the contract and to keep accounting records is retained for the statutory periods.",
      },
      {
        heading: "10. Complaints and mediation",
        body:
          "Any complaint must first be sent to our customer service, by email to contact@mlc-bois.fr or by post to the registered office. We reply within fourteen days.\n\n" +
          "Failing a solution, consumers may refer the matter free of charge to the consumer ombudsman whose details appear in the legal notice, within one year of the written complaint at the latest.",
      },
      {
        heading: "11. Governing law and jurisdiction",
        body:
          "These terms are governed by French law.\n\n" +
          "In a dispute with a consumer, the jurisdiction rules of the French Code of Civil Procedure apply: the consumer may bring proceedings, at their choice, before the court of the place where they lived when the contract was concluded or where the harmful event occurred (article R631-3 of the French Consumer Code).\n\n" +
          "In relation to business customers, jurisdiction is granted to the commercial court in whose district our registered office is located.",
      },
    ],
  },

  confidentialite: {
    title: "Privacy policy",
    intro:
      "Information on the processing of your personal data within the meaning of articles 13 and 14 of Regulation (EU) 2016/679 (GDPR) and of French law no. 78-17 of 6 January 1978 as amended.",
    sections: [
      {
        heading: "Data controller",
        body: "The controller within the meaning of article 4(7) GDPR is:",
        list: [
          "MLC BOIS",
          "27 Grande Rue",
          "21700 Villebichot",
          "France",
          "Email: contact@mlc-bois.fr",
          "Phone: +33 6 35 01 35 57",
        ],
      },
      {
        heading: "Data protection officer",
        body: "For any question about your data, write to confidentialite@mlc-bois.fr, or by post to the registered office marked “Data protection”. Appointing a data protection officer is not mandatory for a business of this size; that address remains the single point of contact.",
      },
      {
        heading: "Data processed when you place an order",
        body: "To process an order we collect the following data:",
        list: [
          "Title, first name and surname",
          "Billing address and, where applicable, delivery address",
          "Email address",
          "Phone number, needed to agree the delivery slot",
          "Order contents, amounts and the payment method chosen",
          "IP address and timestamp of the order confirmation",
        ],
      },
      {
        heading: "Purposes and legal bases",
        body: "Each processing operation rests on an identified legal basis:",
        list: [
          "Performance of the sale and delivery contract — article 6(1)(b) GDPR",
          "Compliance with legal obligations, in particular accounting and tax — article 6(1)(c)",
          "Fraud prevention and site security — legitimate interest, article 6(1)(f)",
          "Sending marketing communications — consent, article 6(1)(a), which may be withdrawn at any time",
        ],
      },
      {
        heading: "Customer account",
        body: "Creating an account is optional: ordering as a guest remains possible, in line with the minimisation principle of article 5(1)(c) GDPR. Passwords are stored as a non-reversible hash and are never readable, including by our own staff.",
      },
      {
        heading: "Recipients of the data",
        body: "Your data is only passed to the recipients needed to perform the contract:",
        list: [
          "The carrier, for transport and for arranging the appointment",
          "The payment provider, for collecting payment",
          "Our accountant and the tax authorities, under statutory obligations",
          "The site's host, as a processor within the meaning of article 28 GDPR",
          "Smartsupp s.r.o. (Czech Republic), which provides the live chat, for the conversations you choose to start",
        ],
      },
      {
        heading: "Retention periods",
        body: "We keep your data only as long as necessary:",
        list: [
          "Order data and invoices: ten years from the close of the financial year (article L123-22 of the French Commercial Code) and six years under the right of communication (article L102 B of the French Book of Tax Procedures)",
          "Customer account: until you delete it, then erased within thirty days",
          "Prospects and recipients of marketing communications: three years from the last contact",
          "Connection logs: twelve months",
        ],
      },
      {
        heading: "Cookies and trackers",
        body:
          "The site relies on cookies that are strictly necessary for it to work: login session, basket and language preference. Those cookies are exempt from consent under article 82 of the French Data Protection Act, as interpreted by the CNIL.\n\n" +
          "A live chat, provided by Smartsupp s.r.o. (Czech Republic), is offered through a button in the bottom right corner of the screen. It loads only once you click it: until you open it, no Smartsupp script or cookie is set and no data reaches that provider.\n\n" +
          "By opening the chat you expressly request that service. The visitor identifier then set ties together the messages of a single conversation; its retention period is the one published by Smartsupp in its own documentation.\n\n" +
          "No third-party analytics, advertising or social network cookie is set.",
      },
      {
        heading: "Your rights",
        body: "Under the conditions laid down by the GDPR, you have the following rights:",
        list: [
          "Right of access to your data — article 15",
          "Right to rectification — article 16",
          "Right to erasure — article 17",
          "Right to restriction of processing — article 18",
          "Right to data portability — article 20",
          "Right to object — article 21",
          "Right to withdraw your consent at any time, without retroactive effect",
        ],
      },
      {
        heading: "Exercising your rights",
        body:
          "Send your request to contact@mlc-bois.fr or by post to the registered office. We reply within the one-month period laid down by article 12(3) GDPR, extendable by two months for complex requests.\n\n" +
          "From your customer account you can also export your data as JSON and delete your account without going through us.",
      },
      {
        heading: "Limits to the right to erasure",
        body: "Deleting an account does not delete orders already fulfilled: invoices and accounting records are subject to the statutory retention periods set out above, a case expressly provided for by article 17(3)(b) GDPR. Those orders are then detached from the account and any contact details not required on the invoice are removed from them.",
      },
      {
        heading: "Complaint to the CNIL",
        body: "If you consider that the processing of your data breaches the GDPR, you may lodge a complaint with the French data protection authority — Commission nationale de l'informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr.",
      },
      {
        heading: "Security",
        body: "Exchanges with the site are encrypted using TLS. Access to data is limited to those who need it, back-office authentication requires a second factor, and technical secrets are encrypted at rest. These measures are reviewed regularly under article 32 GDPR.",
      },
    ],
  },

  retractation: {
    title: "Right of withdrawal",
    intro:
      "Notice: this text is a carefully drafted template for the MLC Bois online shop. The company identity, address, registration and VAT number are those on the public register. Still to be filled in before publication: the share capital, the president's name, the phone number, the insurer and the consumer ombudsman. Have the text reviewed by a lawyer afterwards — only then is it fit for use.\n\n" +
      "Pre-contractual information on the right of withdrawal, in accordance with articles L221-18 to L221-28 of the French Consumer Code and with the model form annexed to article R221-1.",
    sections: [
      {
        heading: "Right of withdrawal",
        body:
          "You have the right to withdraw from this contract without giving any reason within fourteen days.\n\n" +
          "The withdrawal period expires fourteen days after the day on which you, or a third party other than the carrier and indicated by you, take physical possession of the last of the goods.\n\n" +
          "Where an order covers several items delivered separately, the period runs from receipt of the last item.",
      },
      {
        heading: "How to exercise this right",
        body:
          "To exercise the right of withdrawal, you must inform us of your decision by an unambiguous statement — a letter sent by post or an email. You may use the model form below, though you are not obliged to.\n\n" +
          "Send your notification to:\n\nMLC BOIS\n27 Grande Rue\n21700 Villebichot\nFrance\nEmail: contact@mlc-bois.fr\nPhone: +33 6 35 01 35 57\n\n" +
          "To meet the withdrawal deadline, it is enough that your notification is sent before the fourteen-day period has expired.",
      },
      {
        heading: "Effects of withdrawal",
        body:
          "If you withdraw, we will reimburse all payments received from you, including delivery costs — except for the supplementary costs arising from your choosing a type of delivery other than the least expensive type of standard delivery we offer.\n\n" +
          "We will make the reimbursement without undue delay and, in any event, no later than fourteen days from the day on which we are informed of your decision. We may withhold reimbursement until we have received the goods back or until you have supplied evidence of having sent them back, whichever is the earliest.\n\n" +
          "We will make the reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, this reimbursement will not cost you anything.",
      },
      {
        heading: "Sending the goods back",
        body:
          "You must send the goods back or hand them over without undue delay and, in any event, no later than fourteen days from the day on which you communicate your withdrawal to us. That deadline is met if you send the goods back before it expires.\n\n" +
          "Return address: MLC BOIS, returns department, 27 Grande Rue, 21700 Villebichot, France.\n\n" +
          "You will have to bear the direct cost of returning the goods. As firewood is delivered loose or on pallets, that return cannot normally be made by post: the cost of return is estimated at between €90 and €180 per pallet depending on the delivery area, in accordance with the estimation requirement of article L221-5 of the French Consumer Code.\n\n" +
          "You are only liable for any diminished value of the goods resulting from handling other than what is necessary to establish their nature, characteristics and functioning. Wood that has already been burnt obviously cannot be taken back.",
      },
      {
        heading: "Exceptions to the right of withdrawal",
        body: "The right of withdrawal does not apply, in accordance with article L221-28 of the French Consumer Code, in particular to contracts:",
        list: [
          "For the supply of goods made to your specifications or clearly personalised — a custom log length, for instance",
          "For the supply of goods which, after delivery and by their nature, are inseparably mixed with other items — a loose load tipped onto an existing stock, for instance",
          "For the supply of goods liable to deteriorate or expire rapidly",
          "Concluded by a professional acting in the course of their business, withdrawal being reserved for consumers",
        ],
      },
      {
        heading: "Model withdrawal form",
        body: "Please complete and return this form only if you wish to withdraw from the contract.",
        list: [
          "To MLC BOIS, 27 Grande Rue, 21700 Villebichot, France, contact@mlc-bois.fr:",
          "I hereby give notice of my withdrawal from the contract for the sale of the goods below:",
          "Ordered on … / received on …",
          "Order number: …",
          "Consumer's name: …",
          "Consumer's address: …",
          "Consumer's signature (only where this form is notified on paper)",
          "Date: …",
        ],
      },
    ],
  },

  livraison: {
    title: "Delivery",
    intro:
      "Areas served, lead times, prices and unloading conditions. This information forms part of the pre-contractual information required by article L221-5 of the French Consumer Code.",
    sections: [
      {
        heading: "Delivery area",
        body: "We deliver in France and in Belgium, with two delivery options: **standard** delivery and **express** delivery.",
      },
      {
        heading: "Prices",
        body: "Standard delivery is free, with no minimum order value, and takes 3 to 5 business days. Express delivery costs €60.00 and arrives within 24 to 48 hours.",
      },
      {
        heading: "Lead times",
        body:
          "The stated lead times run from confirmation of the delivery slot and, for payments by prior bank transfer, from the actual receipt of the funds.\n\n" +
          "Where no date is stated, delivery takes place no later than thirty days after the contract is concluded, in accordance with article L216-1 of the French Consumer Code. If we fail to meet that obligation, you may require us to deliver within a further reasonable period, and then terminate the contract by registered letter if we still do not perform. The sums paid are then refunded to you within fourteen days.",
      },
      {
        heading: "Unloading",
        body: "Unloading at the kerb or in the driveway is included in the price, provided a 7.5-tonne vehicle can reach the property and manoeuvre there. Tell us when ordering about any narrow access, low gateway, enclosed courtyard or restricted parking: we adapt the vehicle.",
      },
      {
        heading: "Taking delivery",
        body:
          "Check the goods in the driver's presence. Any reservation must be written on the delivery note precisely and in detail; a general note such as “subject to unpacking” has no value.\n\n" +
          "This formality does not affect your statutory guarantees: the guarantee of conformity and the guarantee against hidden defects remain available even without a reservation at delivery.",
      },
      {
        heading: "Transfer of risk",
        body: "The risk of loss of or damage to the goods passes to you when you take physical possession of them, in accordance with article L216-4 of the French Consumer Code. Where you entrust delivery to a carrier of your own choosing, that transfer occurs when the goods are handed over to that carrier.",
      },
    ],
  },

  "moyens-de-paiement": {
    title: "Payment methods",
    intro:
      "Accepted payment methods, transaction security and invoicing. The methods actually in use are those displayed during checkout.",
    sections: [
      {
        heading: "Accepted methods",
        body: "The available payment methods are shown at the “Payment” step of the checkout. Depending on the configuration in force, they may include:",
        list: ["Payment card (Carte Bleue, Visa, Mastercard)", "Bank transfer", "PayPal"],
      },
      {
        heading: "No surcharges",
        body: "No fee is charged according to the payment method chosen. Article L112-11 of the French Monetary and Financial Code prohibits charging fees for the use of a card-based payment instrument or a euro credit transfer within the European Economic Area.",
      },
      {
        heading: "Transaction security",
        body:
          "Payment data is transmitted directly to the payment provider over an encrypted connection. It never passes through our servers in the clear and is never stored there.\n\n" +
          "Card payments are subject to strong customer authentication in accordance with the second Payment Services Directive.",
      },
      {
        heading: "Bank transfer",
        body:
          "If you pay by transfer, quote the order number as the reference. Our bank details appear on the confirmation page and in the confirmation email.\n\n" +
          "The order is prepared once the funds have actually been received. If no transfer reaches us within ten business days, the order is cancelled and the stock released.",
      },
      {
        heading: "Invoice",
        body:
          "A PDF invoice is attached to the order confirmation email. It carries every particular required by article 242 nonies A of Annex II to the French General Tax Code, including the amount excluding tax, the VAT rate and amount, and the total including all taxes.\n\n" +
          "Customers with an account can find their invoices at any time in the “My orders” section.",
      },
      {
        heading: "Late payment",
        body: "For business customers, any late payment automatically gives rise to penalties calculated at three times the statutory interest rate, together with a fixed indemnity of €40 for recovery costs, in accordance with articles L441-10 and D441-5 of the French Commercial Code.",
      },
    ],
  },

  retours: {
    title: "Returns & complaints",
    intro:
      "What to do if a product is not as described, arrives damaged or is being returned under the right of withdrawal, and a reminder of the statutory guarantees you enjoy.",
    sections: [
      {
        heading: "Two distinct situations",
        body: "A return may fall under two different regimes, which do not give the same rights:",
        list: [
          "Withdrawal: you change your mind, with no reason to give, within fourteen days. Return costs are yours. See the “Right of withdrawal” page.",
          "The statutory guarantee: the product is not as described or is affected by a defect. Return and repair costs are ours.",
        ],
      },
      {
        heading: "Statutory guarantee of conformity",
        body:
          "This statutory guarantee applies to our wood-burning stoves. The seller must deliver goods that conform to the contract and is liable for any lack of conformity existing at the time of delivery (articles L217-3 et seq. of the French Consumer Code).\n\n" +
          "You have two years from delivery of the goods to bring a claim. During that period you do not have to prove the lack of conformity: it is presumed to have existed on the day of delivery.\n\n" +
          "You may choose between repair and replacement, subject to the cost conditions of article L217-12. If neither is possible, you may obtain a price reduction or rescission of the sale.",
      },
      {
        heading: "Guarantee against hidden defects",
        body:
          "Independently of the guarantee of conformity, you may invoke the guarantee against hidden defects within the meaning of article 1641 of the French Civil Code. In that case you may choose between rescission of the sale and a price reduction, in accordance with article 1644 of the French Civil Code.\n\n" +
          "The claim must be brought within two years of discovering the defect.",
      },
      {
        heading: "What is not a defect",
        body: "Wood is a natural product. The following variations are normal and do not amount to a lack of conformity:",
        list: [
          "Differences in colour, bark and grain between two logs or two batches",
          "Star-shaped drying cracks on the cut face, which are on the contrary a sign of correct drying",
          "Size variations within the tolerance stated for the length ordered",
          "Traces of moss or lichen on the bark, with no effect on combustion",
        ],
      },
      {
        heading: "Moisture readings",
        body: "A measurement record comes with every delivery. If you find a moisture content higher than the one stated, measure on a freshly split log rather than on the outer face, then send us a photograph of the moisture meter with the order number. A moisture content on a wet basis above the figure stated is a lack of conformity and gives rise to replacement or a price reduction.",
      },
      {
        heading: "Opening a complaint",
        body:
          "Write to contact@mlc-bois.fr, quoting the order number, the nature of the problem and, if possible, photographs. We reply within two business days and tell you what to do before anything is sent back.\n\n" +
          "Do not ship anything without telling us first: an unannounced return cannot be matched to your file.",
      },
      {
        heading: "Return address",
        body: "MLC BOIS, returns department, 27 Grande Rue, 21700 Villebichot, France",
      },
      {
        heading: "Refunds",
        body: "Refunds are made using the same means of payment as the one used for the order, unless you expressly agree to another means. They are made no later than fourteen days after the returned goods are received or after proof of their dispatch.",
      },
      {
        heading: "Mediation",
        body: "If our answer does not satisfy you, you may refer the matter free of charge to the consumer ombudsman whose details appear in the legal notice, within one year of your written complaint at the latest.",
      },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    sections: [
      {
        heading: "How much wood do I need for a winter?",
        body:
          "It depends on the appliance and on how you use it. For a log stove used as top-up heating in the evening and at weekends, allow 5 to 8 loose cubic metres per season. As the main heating in a properly insulated house, allow 12 to 18 MAP.\n\n" +
          "The calculator on the home page gives you the stacked volume and the weight matching the quantity you have in mind.",
      },
      {
        heading: "Which log length should I choose?",
        body:
          "Measure the width of the firebox and take off five centimetres at each side. 25 cm suits compact stoves, 33 cm is the most common length, and 50 cm is for wide inserts and open fireplaces.\n\n" +
          "When in doubt, take the shorter length: a log that is too long will not fit, whereas a log that is too short burns perfectly well.",
      },
      {
        heading: "What is the difference between MAP, stère and solid cubic metre?",
        body:
          "A loose cubic metre (mètre cube apparent, MAP) is one cubic metre of wood tipped loose. Stacked neatly, the same volume gives about 0.7 stère. Take out all the air between the logs and about 0.4 cubic metre of solid wood remains.\n\n" +
          "We sell by the loose cubic metre, because that is the quantity that actually arrives at your door.",
      },
      {
        heading: "Is the wood really dry?",
        body:
          "Our wood leaves the kiln after 72 hours at 75 °C, with a moisture content below 18 % on a wet basis. Every batch is measured and the reading comes with the delivery.\n\n" +
          "To check for yourself, push a moisture meter into a freshly split log rather than against the outer face: on the outside, even damp wood gives a low reading.",
      },
      {
        heading: "How should I store the wood after delivery?",
        body:
          "Under cover, away from the wall so air can circulate, and never straight on the ground — a pallet underneath is enough. Kiln-dried wood no longer needs to dry, but it takes moisture back up if it is left exposed.\n\n" +
          "In a closed, unventilated cellar, wood climbs back above 20 % within a year.",
      },
      {
        heading: "Do you supply the trade?",
        body: "Yes. For wood-fired ovens, grill restaurants and bakeries we supply beech in 25 and 33 cm below 15 % moisture on a wet basis, with weekly replenishment on request. Volume pricing applies from three pallets a month.",
      },
      {
        heading: "Can I choose the delivery date?",
        body: "Yes. You give a preferred date when ordering and we call the day before to confirm a two-hour slot. Payment is only taken once the slot is confirmed, except for immediate card payments.",
      },
      {
        heading: "What happens if access is difficult?",
        body: "Tell us when you order. We then come with the small trailer, for a €20 surcharge.",
      },
      {
        heading: "Can I order without creating an account?",
        body: "Yes. Ordering as a guest is possible and an account remains optional. Creating an account simply saves you re-entering your address and gives you access to your order history and your invoices.",
      },
      {
        heading: "How do I track my order?",
        body: "The confirmation email contains a tracking link that works without logging in. If you have an account, the “My orders” section shows the same progress.",
      },
    ],
  },

  "a-propos": {
    title: "About MLC Bois",
    sections: [
      {
        heading: "What we sell",
        body: "Firewood ready to burn, kiln-dried, delivered by us. Beech, oak, birch and ash from French forests, in 25, 33 and 50 cm logs, alongside compressed logs, ENplus A1 certified pellets and kindling.",
      },
      {
        heading: "Why kiln drying",
        body:
          "Air-dried wood takes two summers to fall below 20 % moisture on a wet basis — and even then, only if it is stored properly. The kiln does the same job in 72 hours, under controlled and verifiable conditions.\n\n" +
          "The difference is not cosmetic: the water held in the wood has to evaporate before combustion releases any useful heat. Wood at 30 % moisture loses nearly half its calorific value to that evaporation, fouls the flue and blackens the glass.",
      },
      {
        heading: "Measured, not promised",
        body: "Every batch is measured before it leaves us and the reading travels with the delivery. “Dry wood” means nothing until a figure comes with it; a moisture meter costs less than €20 and puts an end to any argument.",
      },
      {
        heading: "Our own logistics",
        body:
          "We deliver throughout France and to Belgium, in two ways that we keep clearly apart.\n\n" +
          "In France we deliver ourselves, with our own trailer. No missed-delivery card, no pallet waiting three days in a depot. We call the day before and give you a two-hour slot.\n\n" +
          "For Belgium, we ship on pallets through a carrier: the service is then the carrier's, and we say so rather than let you believe otherwise.",
      },
      {
        heading: "Where the wood comes from",
        body: "Our wood comes from sustainably managed French forests certified PEFC. Local sourcing keeps transport down, and transport weighs heavily in the footprint of a product sold by volume.",
      },
      {
        heading: "Legal information",
        body: "MLC BOIS, a single-shareholder simplified joint-stock company (SASU) with share capital of €30,000, 27 Grande Rue, 21700 Villebichot. RCS Dijon 990 527 871. Intra-Community VAT number: FR71990527871. Full details appear in the legal notice.",
      },
    ],
  },

  contact: {
    title: "Contact",
    sections: [
      {
        heading: "Customer service",
        body: "For any question about an order, a lead time or a product, you can reach us Monday to Friday from 8am to 5pm and Saturday from 9am to 1pm.",
        list: [
          "Phone: +33 6 35 01 35 57 (standard rate)",
          "Email: contact@mlc-bois.fr",
          "Form: www.mlc-bois.fr/en/contact",
        ],
      },
      {
        heading: "Postal address",
        body: "MLC BOIS\n27 Grande Rue\n21700 Villebichot\nFrance",
      },
      {
        heading: "Order tracking",
        body: "The tracking link is in the confirmation email and works without logging in. If you have an account, the “My orders” section shows the same progress. Keep the order number to hand: it speeds up any exchange.",
      },
      {
        heading: "Complaints",
        body: "Send your complaint to contact@mlc-bois.fr, quoting the order number and, if possible, photographs. We reply within two business days. The detailed procedure appears on the “Returns & complaints” page.",
      },
      {
        heading: "Trade orders and large volumes",
        body: "Restaurants, bakeries, campsites, local authorities and property managers should write to contact@mlc-bois.fr with “Trade” in the subject line, stating the monthly volume envisaged and the delivery address. We reply the same business day, with volume pricing.",
      },
      {
        heading: "Data protection",
        body: "Requests to access, rectify or erase your data go to confidentialite@mlc-bois.fr, or by post to the registered office marked “Data protection”. We reply within the one-month period laid down by the GDPR.",
      },
      {
        heading: "Press and partnerships",
        body: "Press enquiries and partnership proposals should be sent to contact@mlc-bois.fr with “Press” or “Partnership” in the subject line.",
      },
      {
        heading: "Legal information",
        body: "MLC BOIS, represented by Clément Mauroy. RCS Dijon 990 527 871. Intra-Community VAT number: FR71990527871. Full details appear in the legal notice.",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

const SLUGS = Object.keys(TRADUCTIONS) as LegalSlug[];

/** Différences de structure entre la page française et sa traduction. */
function ecarts(fr: LegalPage, traduction: Traduction): string[] {
  const messages: string[] = [];

  if (Boolean(fr.intro) !== Boolean(traduction.intro)) {
    messages.push(
      fr.intro ? "la page française a un chapeau, pas la traduction" : "chapeau en trop",
    );
  }
  if (fr.sections.length !== traduction.sections.length) {
    messages.push(
      `${fr.sections.length} sections en français, ${traduction.sections.length} traduites`,
    );
    return messages;
  }

  for (const [index, section] of fr.sections.entries()) {
    const attendues = section.list?.length ?? 0;
    const obtenues = traduction.sections[index].list?.length ?? 0;
    if (attendues !== obtenues) {
      messages.push(
        `section ${index + 1} (« ${section.heading} ») : ${attendues} puces en français, ${obtenues} traduites`,
      );
    }
  }
  return messages;
}

async function main(): Promise<void> {
  const simuler = process.argv.includes("--simuler");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query<{ slug: string; data: string }>(
      `SELECT slug, data FROM "LegalContent" WHERE locale = 'fr'`,
    );
    const francais = new Map<string, LegalPage>();
    for (const row of rows) {
      const controle = normalizeLegalPage(JSON.parse(row.data), row.slug as LegalSlug);
      if (controle.ok) francais.set(row.slug, controle.page);
    }

    const manquantes = SLUGS.filter((slug) => !francais.has(slug));
    if (manquantes.length > 0) {
      throw new Error(
        `Pages françaises absentes ou illisibles en base : ${manquantes.join(", ")}. ` +
          "La traduction se cale sur la version française : rien n'est écrit tant qu'elle manque.",
      );
    }

    // Contrôle d'abord, écriture ensuite : une page anglaise à jour à côté
    // d'une page périmée serait pire que dix pages périmées.
    const pages: { slug: LegalSlug; page: LegalPage }[] = [];
    const problemes: string[] = [];

    for (const slug of SLUGS) {
      const fr = francais.get(slug) as LegalPage;
      const traduction = TRADUCTIONS[slug];

      const differences = ecarts(fr, traduction);
      if (differences.length > 0) {
        problemes.push(`${slug} : ${differences.join(" ; ")}`);
        continue;
      }

      const controle = normalizeLegalPage(
        {
          title: traduction.title,
          intro: traduction.intro ?? "",
          sections: traduction.sections.map((section) => ({
            heading: section.heading,
            body: section.body,
            list: [...(section.list ?? [])],
          })),
          // La date de révision vient du français : les deux versions annoncent
          // la même révision, sans qu'aucune date ne soit saisie deux fois.
          updatedAt: fr.updatedAt,
        },
        slug,
      );
      if (!controle.ok) {
        problemes.push(`${slug} : ${controle.error}`);
        continue;
      }

      pages.push({ slug, page: controle.page });
    }

    if (problemes.length > 0) {
      throw new Error(
        `La traduction ne correspond plus au texte français :\n  - ${problemes.join("\n  - ")}\n` +
          "Mettez à jour TRADUCTIONS dans ce script, puis relancez.",
      );
    }

    for (const { slug, page } of pages) {
      console.log(
        `${simuler ? "[simulation] " : ""}${slug}/en — ${page.sections.length} sections, révision ${page.updatedAt}`,
      );
      if (simuler) continue;

      await client.query(
        `INSERT INTO "LegalContent" (slug, locale, data, "updatedBy", "updatedAt")
         VALUES ($1, 'en', $2, $3, NOW())
         ON CONFLICT (slug, locale)
         DO UPDATE SET data = EXCLUDED.data, "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = NOW()`,
        [slug, JSON.stringify(page), AUTEUR],
      );
    }

    console.log(
      simuler
        ? `\n${pages.length} pages contrôlées, aucune écriture (--simuler).`
        : `\n${pages.length} pages anglaises enregistrées.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
