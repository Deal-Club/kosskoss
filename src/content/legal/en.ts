/**
 * Legal and informational content in ENGLISH — MLC Bois.
 *
 * Mirror of src/content/legal/fr.ts. The French version is authoritative: the
 * shop sells in France under French law, and this translation exists so that a
 * non-French-speaking customer can read the same terms. Where the two versions
 * diverge, the French text prevails.
 *
 * WARNING: every company detail is a PLACEHOLDER (address, company register,
 * VAT number, share capital, rates, insurer). See docs/LEGAL.md for the full
 * list of items to replace before going live, and have a lawyer review the
 * text.
 */

import type { LegalPageMap } from "./types";
import { COMPANY } from "./fr";

/** Date of the last editorial revision of the English corpus. */
const UPDATED_AT = "2026-07-30";

/** Return address (same as the registered office in this template). */
const RETURN_ADDRESS = `${COMPANY.name}, returns department, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}`;

/** Notice placed at the top of every legal page. */
const DISCLAIMER =
  "Notice: this text is a carefully drafted template for the MLC Bois online shop. The company identity, address, registration and VAT number are those on the public register. Still to be filled in before publication: share capital, the president's name, the phone number, the insurer and the consumer ombudsman. Have the text reviewed by a lawyer afterwards — only then is it fit for use. This English version is a translation for information; the French text is the binding one.";

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
      "Publisher information required by article 6 III of French law no. 2004-575 of 21 June 2004 on confidence in the digital economy (LCEN) and by article R123-237 of the French Commercial Code.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Publisher",
        body: "This online shop is published by:",
        list: [
          COMPANY.name,
          `Single-shareholder simplified joint-stock company (SASU) with share capital of ${COMPANY.capital}`,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
        ],
      },
      {
        heading: "Legal representative and publication director",
        body: `President: ${COMPANY.managingDirector}\n\nThe president also acts as publication director within the meaning of article 6 III 2° of the LCEN.`,
      },
      {
        heading: "Contact us",
        body: "You can reach us directly through the channels below. Our customer service is available Monday to Friday from 8am to 5pm and Saturday from 9am to 1pm.",
        list: [
          `Phone: ${COMPANY.phone} (standard rate)`,
          `Email: ${COMPANY.email}`,
          `Contact form: ${COMPANY.domain}/en/contact`,
        ],
      },
      {
        heading: "Company registration",
        body: `Registration with the trade and companies register: ${COMPANY.register}.\n\nSIREN number: ${COMPANY.siren}\nSIRET number (registered office): ${COMPANY.siret}\n\nBusiness activity code (APE/NAF): 4673A (wholesale of wood and construction materials) — to be confirmed against the declared activity.`,
      },
      {
        heading: "VAT number",
        body: `Intra-Community VAT identification number: ${COMPANY.vatId}.\n\nFirewood for domestic use falls under the reduced 10 % rate (article 278 bis of the French General Tax Code). Supplies and services outside that regime are invoiced at the standard 20 % rate.`,
      },
      {
        heading: "Hosting",
        body: `The site is hosted by:\n\n${COMPANY.host}`,
      },
      {
        heading: "Professional liability insurance",
        body: "Information on professional and product liability insurance (optional disclosure, mandatory for certain regulated activities):",
        list: [
          "Insurer: name of the company (placeholder)",
          "Insurer's address (placeholder)",
          "Geographical scope of cover: mainland France (placeholder)",
        ],
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

  /* ------------------------------------------------------------------ */
  /* Terms and conditions                                                */
  /* ------------------------------------------------------------------ */
  cgv: {
    slug: "cgv",
    title: "Terms and conditions of sale",
    intro: intro(
      "These terms govern sales concluded on the MLC Bois online shop. They form the single framework of the commercial relationship within the meaning of article L441-1 of the French Commercial Code.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "1. Scope",
        body: `These terms and conditions of sale apply to every order placed on ${COMPANY.domain} with ${COMPANY.name}. They are binding on the customer, who acknowledges having read and accepted them before validating an order.\n\nThey apply both to consumers, within the meaning of the preliminary article of the French Consumer Code, and to business customers. Provisions expressly reserved for consumers — in particular the right of withdrawal — do not benefit traders acting in the course of their business, subject to the exceptions provided by law.\n\nAny conflicting condition put forward by the customer is unenforceable unless we accept it in writing.`,
      },
      {
        heading: "2. Products and availability",
        body: "The products on offer are those shown on the site on the day of consultation, while stocks last. Photographs and descriptions are indicative: wood is a natural product whose colour, bark and size vary from batch to batch without this constituting a lack of conformity.\n\nVolumes are expressed in loose cubic metres, that is, the volume occupied by wood tipped in loose. One loose cubic metre corresponds to roughly 0.7 stacked cubic metres and to roughly 0.4 solid cubic metres of actual wood. Customary trade tolerances apply.\n\nShould an item become unavailable after the order, we will inform you without delay and refund all sums paid within fourteen days at the latest, in accordance with article L216-3 of the French Consumer Code.",
      },
      {
        heading: "3. Prices",
        body: "Prices are stated in euros, all taxes included. Firewood for domestic use benefits from the reduced 10 % VAT rate under article 278 bis of the French General Tax Code; other items and services are subject to the rate applicable to their nature.\n\nDelivery costs are shown separately before the order is validated, in accordance with article L221-5 of the French Consumer Code. The total price payable is displayed legibly on the summary page before payment.\n\nWe reserve the right to change our prices at any time. The applicable price is the one displayed when the order is validated.",
      },
      {
        heading: "4. Placing an order",
        body: "An order goes through three steps: contact details and addresses, choice of payment method, then review and confirmation. You can correct your details at each step before the final confirmation.\n\nClicking the button marked “Place order with obligation to pay” constitutes firm acceptance of the order and of these terms, in accordance with article L221-14 of the French Consumer Code.\n\nWe acknowledge receipt of the order by email, on a durable medium, within a reasonable time and no later than delivery. The contract is formed only upon that acknowledgement.",
      },
      {
        heading: "5. Payment",
        body: "The payment methods accepted are listed on the “Payment methods” page and during checkout. Payment data is transmitted in encrypted form and is never stored on our servers.\n\nWhere payment is made by advance bank transfer, the order is prepared once the funds have actually been received. Where a business customer pays late, penalties equal to three times the statutory interest rate and a fixed recovery indemnity of €40 are due as of right (articles L441-10 and D441-5 of the French Commercial Code).",
      },
      {
        heading: "6. Delivery",
        body: `We deliver within mainland France. Zones, lead times and rates are set out on the “Delivery” page.\n\nDelivery is made to the boundary of the property: kerbside or driveway unloading is included in the price, provided a 7.5-tonne vehicle can gain access. Stacking in a yard, cellar or garage is subject to a supplement announced before the order.\n\nIn the absence of a stated date, we deliver no later than thirty days after the contract is concluded (article L216-1 of the French Consumer Code). If we fail to do so, you may require us to deliver within a reasonable additional period and then terminate the contract if we still fail to perform.\n\nRisk passes to the customer when physical possession of the goods is taken (article L216-4 of the French Consumer Code).`,
      },
      {
        heading: "7. Right of withdrawal",
        body: `Consumers have fourteen days to exercise their right of withdrawal without giving reasons, under articles L221-18 et seq. of the French Consumer Code. The full terms and the model form are on the “Right of withdrawal” page.\n\nReturn address: ${RETURN_ADDRESS}.`,
      },
      {
        heading: "8. Statutory guarantees",
        body: "All our products benefit from the statutory guarantee of conformity (articles L217-3 et seq. of the French Consumer Code) and from the guarantee against hidden defects (articles 1641 et seq. of the French Civil Code). Details and the procedure to follow are on the “Returns & complaints” page.\n\nThe guarantee of conformity applies for two years from delivery of the goods. During that period the consumer does not have to prove the existence of the defect: it is presumed to have existed on the day of delivery.",
      },
      {
        heading: "9. Retention of title",
        body: "The goods delivered remain our property until the price has been paid in full. This retention of title does not prevent risk from passing, which occurs when the goods are handed over.",
      },
      {
        heading: "10. Personal data",
        body: "The processing of personal data collected when an order is placed is described on the “Privacy policy” page. Data strictly necessary for the performance of the contract and for the retention of accounting records is kept for the statutory periods.",
      },
      {
        heading: "11. Complaints and mediation",
        body: `Any complaint must first be sent to our customer service, by email to ${COMPANY.email} or by post to the registered office. We reply within fourteen days.\n\nIf no solution is found, a consumer may refer the matter free of charge to the consumer ombudsman whose details appear in the legal notice, within one year of the written complaint at the latest.`,
      },
      {
        heading: "12. Governing law and jurisdiction",
        body: "These terms are governed by French law.\n\nIn a dispute with a consumer, the rules of jurisdiction of the French Code of Civil Procedure apply: the consumer may bring proceedings, at their choice, before the court of the place where they resided when the contract was concluded or where the harmful event occurred (article R631-3 of the French Consumer Code).\n\nIn respect of a business customer, jurisdiction lies with the commercial court in whose district our registered office is located.",
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
      "Information on the processing of your personal data within the meaning of articles 13 and 14 of Regulation (EU) 2016/679 (GDPR) and of French law no. 78-17 of 6 January 1978 as amended.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Data controller",
        body: "The controller within the meaning of article 4(7) GDPR is:",
        list: [
          COMPANY.name,
          COMPANY.street,
          COMPANY.city,
          COMPANY.country,
          `Email: ${COMPANY.email}`,
          `Phone: ${COMPANY.phone}`,
        ],
      },
      {
        heading: "Data protection contact",
        body: "For any question about your data, write to confidentialite@mlc-bois.fr or by post to the registered office marked “Data protection”. Appointing a data protection officer is not mandatory for a business of this size; this address remains the single point of contact.",
      },
      {
        heading: "Data processed when you order",
        body: "To process an order we collect the following data:",
        list: [
          "Title, first name and surname",
          "Billing address and, where applicable, delivery address",
          "Email address",
          "Phone number, needed to agree a delivery slot",
          "Order contents, amounts and chosen payment method",
          "IP address and timestamp of the order confirmation",
        ],
      },
      {
        heading: "Purposes and legal bases",
        body: "Each processing operation rests on an identified legal basis:",
        list: [
          "Performance of the sales and delivery contract — article 6(1)(b) GDPR",
          "Compliance with legal obligations, in particular accounting and tax — article 6(1)(c)",
          "Fraud prevention and site security — legitimate interest, article 6(1)(f)",
          "Sending marketing communications — consent, article 6(1)(a), revocable at any time",
        ],
      },
      {
        heading: "Customer account",
        body: "Creating an account is optional: ordering as a guest remains possible, in line with the data minimisation principle in article 5(1)(c) GDPR. The password is stored only as a non-reversible hash and is never readable, including by our own team.",
      },
      {
        heading: "Recipients",
        body: "Your data is disclosed only to recipients necessary for performing the contract:",
        list: [
          "The carrier, for transport and scheduling",
          "The payment provider, for collection",
          "Our accountant and the tax authorities, under statutory obligations",
          "The site host, as a processor within the meaning of article 28 GDPR",
        ],
      },
      {
        heading: "Retention periods",
        body: "We keep your data only as long as necessary:",
        list: [
          "Order data and invoices: ten years from the close of the financial year (article L123-22 of the French Commercial Code) and six years under the right of disclosure (article L102 B of the French Tax Procedure Code)",
          "Customer account: until you delete it, then erased within thirty days",
          "Prospects and marketing recipients: three years from the last contact",
          "Connection logs: twelve months",
        ],
      },
      {
        heading: "Cookies and trackers",
        body: "The site uses only cookies strictly necessary for it to work: sign-in session, cart and language preference. Such cookies are exempt from consent under article 82 of the French Data Protection Act, as interpreted by the CNIL.\n\nNo third-party analytics, advertising or social media cookie is set without your prior consent. Should such trackers be added, a consent banner would be introduced and this page updated.",
      },
      {
        heading: "Your rights",
        body: "Under the conditions laid down by the GDPR, you have the following rights:",
        list: [
          "Right of access — article 15",
          "Right to rectification — article 16",
          "Right to erasure — article 17",
          "Right to restriction of processing — article 18",
          "Right to data portability — article 20",
          "Right to object — article 21",
          "Right to withdraw consent at any time, without retroactive effect",
        ],
      },
      {
        heading: "Exercising your rights",
        body: `Send your request to ${COMPANY.email} or by post to the registered office. We reply within the one-month period laid down in article 12(3) GDPR, extendable by two months for complex requests.\n\nFrom your customer account you can also export your data as JSON and delete your account without going through us.`,
      },
      {
        heading: "Limits to erasure",
        body: "Deleting an account does not delete orders already fulfilled: invoices and accounting records are subject to the statutory retention periods set out above, a case expressly covered by article 17(3)(b) GDPR. Orders are then detached from the account and any contact details not required on the invoice are removed from them.",
      },
      {
        heading: "Complaint to the supervisory authority",
        body: "If you consider that the processing of your data infringes the GDPR, you may lodge a complaint with the French data protection authority — CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr.",
      },
      {
        heading: "Security",
        body: "Traffic with the site is encrypted using TLS. Access to data is limited to those who need it, back-office authentication requires a second factor, and technical secrets are encrypted at rest. These measures are reviewed regularly under article 32 GDPR.",
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
      "Pre-contractual information on the right of withdrawal, in line with articles L221-18 to L221-28 of the French Consumer Code and the model form annexed to article R221-1.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Right of withdrawal",
        body: "You have the right to withdraw from this contract within fourteen days without giving any reason.\n\nThe withdrawal period expires fourteen days after the day on which you, or a third party other than the carrier and indicated by you, acquires physical possession of the last of the goods.\n\nWhere an order covers several goods delivered separately, the period runs from receipt of the last item.",
      },
      {
        heading: "How to exercise this right",
        body: `To exercise the right of withdrawal you must inform us of your decision by an unambiguous statement — a letter sent by post or an email. You may use the model form below, though you are not obliged to.\n\nSend your notification to:\n\n${COMPANY.name}\n${COMPANY.street}\n${COMPANY.city}\n${COMPANY.country}\nEmail: ${COMPANY.email}\nPhone: ${COMPANY.phone}\n\nTo meet the withdrawal deadline, it is sufficient for you to send your communication before the fourteen-day period has expired.`,
      },
      {
        heading: "Effects of withdrawal",
        body: "If you withdraw, we will reimburse all payments received from you, including the costs of delivery — with the exception of the supplementary costs resulting from your choosing a type of delivery other than the least expensive type of standard delivery offered by us.\n\nWe will make the reimbursement without undue delay and in any event no later than fourteen days from the day on which we are informed of your decision. We may withhold reimbursement until we have received the goods back or you have supplied evidence of having sent them back, whichever is the earliest.\n\nWe will make the reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of the reimbursement.",
      },
      {
        heading: "Sending the goods back",
        body: `You shall send back the goods without undue delay and in any event no later than fourteen days from the day on which you communicate your withdrawal. The deadline is met if you send back the goods before that period has expired.\n\nReturn address: ${RETURN_ADDRESS}.\n\nYou will have to bear the direct cost of returning the goods. As firewood is delivered loose or on pallets, it cannot normally be returned by post: the cost of return is estimated at between €90 and €180 per pallet depending on the delivery zone, in accordance with the estimation duty in article L221-5 of the French Consumer Code.\n\nYou are only liable for any diminished value of the goods resulting from handling other than what is necessary to establish their nature, characteristics and functioning. Wood that has already been burnt clearly cannot be taken back.`,
      },
      {
        heading: "Exceptions to the right of withdrawal",
        body: "Under article L221-28 of the French Consumer Code, the right of withdrawal does not apply, in particular, to contracts:",
        list: [
          "For goods made to your specifications or clearly personalised — for example a bespoke log length",
          "For goods which, after delivery and by their nature, are inseparably mixed with other items — for example loose wood tipped onto an existing stock",
          "For goods liable to deteriorate or expire rapidly",
          "Concluded by a trader acting in the course of business, withdrawal being reserved for consumers",
        ],
      },
      {
        heading: "Model withdrawal form",
        body: "Complete and return this form only if you wish to withdraw from the contract.",
        list: [
          `To ${COMPANY.name}, ${COMPANY.street}, ${COMPANY.city}, ${COMPANY.country}, ${COMPANY.email}:`,
          "I hereby give notice that I withdraw from my contract of sale of the following goods:",
          "Ordered on … / received on …",
          "Order number: …",
          "Name of consumer: …",
          "Address of consumer: …",
          "Signature of consumer (only if this form is notified on paper)",
          "Date: …",
        ],
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
      "Areas served, lead times, rates and unloading conditions. This information forms part of the pre-contractual information required by article L221-5 of the French Consumer Code.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Delivery area",
        body: "We deliver within mainland France. Corsica and the overseas territories are not served for now: transport there would cost more than the goods.\n\nOur rounds are organised in three zones:",
        list: [
          "Zone A — Paris and inner suburbs (75, 92, 93, 94): delivery within 48 hours",
          "Zone B — outer Île-de-France, Oise and Eure-et-Loir (77, 78, 91, 95, 60, 28): delivery within 3 to 5 working days",
          "Zone C — rest of mainland France: shipped on a pallet by freight carrier, 5 to 8 working days",
        ],
      },
      {
        heading: "Rates",
        body: "Standard delivery is free, with no minimum order value, within 3 to 5 working days.\n\nExpress delivery costs €60.00 and arrives within 24 to 48 hours.\n\nAny supplements are announced before the order is confirmed:",
        list: [
          "Narrow access requiring the small trailer: €20",
          "Stacking in a yard, cellar or garage: €35 per loose cubic metre",
        ],
      },
      {
        heading: "Lead times",
        body: "Stated lead times run from confirmation of the delivery slot and, for advance bank transfers, from actual receipt of the funds.\n\nIn the absence of a stated date, delivery takes place no later than thirty days after the contract is concluded, in accordance with article L216-1 of the French Consumer Code. If we fail to meet that obligation, you may require us to deliver within a reasonable additional period and then terminate the contract by registered letter if we still fail to perform. Sums paid are then refunded within fourteen days.",
      },
      {
        heading: "Booking a slot",
        body: "For zones A and B we call the day before and give a two-hour window. You do not have to keep a whole day free.\n\nFor zone C the carrier makes contact directly, following its own procedures.",
      },
      {
        heading: "Unloading",
        body: "Kerbside or driveway unloading is included in the price, provided a 7.5-tonne vehicle can access and manoeuvre. Tell us about any narrow access, low gate, enclosed courtyard or parking restriction when ordering: we will adapt the vehicle.\n\nIn zone C the pallet is left as close to the address as the carrier can manage, with no handling on our part.",
      },
      {
        heading: "Receiving the goods",
        body: "Check the goods in the driver's presence. Any reservation must be written on the delivery note precisely and in detail; a general note such as “subject to unpacking” has no value.\n\nThis formality does not affect your statutory guarantees: the guarantee of conformity and the guarantee against hidden defects remain available even without a reservation on delivery.",
      },
      {
        heading: "Transfer of risk",
        body: "Risk of loss or damage passes to you when you take physical possession of the goods, in accordance with article L216-4 of the French Consumer Code. Where you entrust delivery to a carrier of your own choosing, risk passes when the goods are handed to that carrier.",
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
          "Bank card (Carte Bleue, Visa, Mastercard)",
          "Advance bank transfer",
          "PayPal",
          "Cash on delivery, which must be stated when ordering",
        ],
      },
      {
        heading: "No surcharges",
        body: "No fee is applied according to the payment method chosen. Article L112-11 of the French Monetary and Financial Code prohibits charging fees for the use of a card-based payment instrument or a euro credit transfer within the European Economic Area.",
      },
      {
        heading: "Transaction security",
        body: "Payment data is transmitted directly to the payment provider over an encrypted connection. It never passes through our servers in the clear and is never stored there.\n\nCard payments are subject to strong customer authentication in accordance with the second Payment Services Directive.",
      },
      {
        heading: "Advance bank transfer",
        body: "When paying by transfer, quote the order number as the reference: without it, matching is manual and delays preparation. The bank details appear on the confirmation page and in the confirmation email.\n\nThe order is prepared once the funds have actually been received. If no transfer reaches us within ten working days, the order is cancelled and the stock released.",
      },
      {
        heading: "Cash on delivery",
        body: "Cash payment on delivery must be stated when ordering: the drivers carry no change and the exact amount must be ready. The legal cap on cash payments between an individual with tax residence in France and a trader is €1,000 (article L112-6 of the French Monetary and Financial Code).",
      },
      {
        heading: "Invoice",
        body: "A PDF invoice is attached to the order confirmation email. It carries every particular required by article 242 nonies A of annex II to the French General Tax Code, including the net amount, the VAT rate and amount, and the gross total.\n\nCustomers with an account can access their invoices at any time under “My orders”.",
      },
      {
        heading: "Late payment",
        body: "For business customers, late payment automatically triggers penalties calculated at three times the statutory interest rate, together with a fixed recovery indemnity of €40, in accordance with articles L441-10 and D441-5 of the French Commercial Code.",
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
      "What to do if a product is non-conforming, damaged or subject to withdrawal, and a reminder of the statutory guarantees available to you.",
    ),
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "Two distinct situations",
        body: "A return may fall under two different regimes, which do not confer the same rights:",
        list: [
          "Withdrawal: you change your mind, with no reason to give, within fourteen days. Return costs are yours. See the “Right of withdrawal” page.",
          "Statutory guarantee: the product is non-conforming or defective. Return and remedy costs are ours.",
        ],
      },
      {
        heading: "Statutory guarantee of conformity",
        body: "The seller is required to deliver goods that conform to the contract and is liable for any lack of conformity existing at the time of delivery (articles L217-3 et seq. of the French Consumer Code).\n\nYou have two years from delivery of the goods to bring a claim. During that period you do not have to prove the lack of conformity: it is presumed to have existed on the day of delivery.\n\nYou may choose between repair and replacement, subject to the cost conditions in article L217-12. If neither is possible, you may obtain a price reduction or rescission of the sale.",
      },
      {
        heading: "Guarantee against hidden defects",
        body: "Independently of the guarantee of conformity, you may rely on the guarantee against hidden defects under article 1641 of the French Civil Code. In that case you may choose between rescission of the sale and a price reduction, in accordance with article 1644 of the Civil Code.\n\nThe claim must be brought within two years of discovering the defect.",
      },
      {
        heading: "What is not a defect",
        body: "Wood is a natural product. The following variations are normal and do not constitute a lack of conformity:",
        list: [
          "Differences in colour, bark and grain between logs or between batches",
          "Star-shaped drying cracks on the end grain, which are in fact a sign of correct drying",
          "Size variations within the stated tolerance for the length ordered",
          "Traces of moss or lichen on the bark, with no effect on combustion",
        ],
      },
      {
        heading: "Moisture readings",
        body: "A measurement record accompanies every delivery. If you find a moisture content higher than stated, measure on a freshly split log rather than the outer face, then send us a photo of the meter together with the order number. A moisture content above the stated figure is a lack of conformity and gives rise to replacement or a price reduction.",
      },
      {
        heading: "Opening a complaint",
        body: `Write to ${COMPANY.email} quoting the order number, the nature of the problem and, if possible, photographs. We reply within two working days and tell you how to proceed before anything is sent back.\n\nDo not ship anything without telling us first: an unannounced return cannot be matched to your file.`,
      },
      {
        heading: "Return address",
        body: RETURN_ADDRESS,
      },
      {
        heading: "Refunds",
        body: "Refunds are made using the same means of payment as the order, unless you expressly agree to another means. They are made no later than fourteen days after the goods are received back or after proof of their dispatch.",
      },
      {
        heading: "Mediation",
        body: "If our answer does not satisfy you, you may refer the matter free of charge to the consumer ombudsman whose details appear in the legal notice, within one year of your written complaint at the latest.",
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
        heading: "How much wood do I need for a winter?",
        body: "It depends on the appliance and how you use it. For a log stove used as supplementary heating in the evening and at weekends, allow 5 to 8 loose cubic metres per season. As primary heating in a reasonably insulated house, allow 12 to 18.\n\nTo picture those volumes: one loose cubic metre is roughly 0.7 stacked cubic metres once stacked, and weighs around 420 kg in hardwood below 18 % moisture. If you are unsure about the quantity, call us rather than guess.",
      },
      {
        heading: "Which log length should I choose?",
        body: "Measure the width of the firebox and take five centimetres off each side. 25 cm suits compact stoves, 33 cm is the most common length, 50 cm is for wide inserts and open fireplaces.\n\nIf in doubt, take the shorter length: a log that is too long will not fit, whereas a shorter one burns perfectly well.",
      },
      {
        heading: "What is the difference between loose, stacked and solid cubic metres?",
        body: "A loose cubic metre is a cubic metre of wood tipped in loose. Neatly stacked, the same volume gives roughly 0.7 stacked cubic metres. Remove all the air between the logs and about 0.4 solid cubic metres of actual wood remains.\n\nWe sell by the loose cubic metre, because that is the quantity that actually arrives at your place.",
      },
      {
        heading: "Is the wood really dry?",
        body: "Our wood leaves the kiln after 72 hours at 75 °C, with a moisture content below 18 %. Every batch is measured and the record comes with the delivery.\n\nTo check for yourself, push a moisture meter into a freshly split log rather than the outer face: on the outside, even wet wood gives a low reading.",
      },
      {
        heading: "How should I store the wood after delivery?",
        body: "Under cover, away from the wall so air can circulate, and never directly on the ground — a pallet underneath is enough. Kiln-dried wood no longer needs to dry, but it takes moisture back up if it is exposed.\n\nIn a closed, unventilated cellar, wood is back above 20 % within a year.",
      },
      {
        heading: "Do you supply businesses?",
        body: "Yes. For wood-fired ovens, grill restaurants and bakeries we supply beech in 25 and 33 cm below 15 % moisture content, on weekly call-off if wanted. Tiered pricing applies from three pallets a month.",
      },
      {
        heading: "How much does delivery cost?",
        body: "Standard delivery is free, with no minimum order value, and arrives within 3 to 5 working days.\n\nExpress delivery costs €60.00 and arrives within 24 to 48 hours. You choose the method at the first step of the checkout: the final total is shown before the payment page.",
      },
      {
        heading: "Do you deliver outside France?",
        body: "We deliver anywhere in France, as well as to selected towns in Belgium.\n\nWithin France we deliver ourselves, on our own trailer. Elsewhere the goods travel on a pallet by freight carrier, and the service is then the carrier's. Either way, you are told before we come.",
      },
      {
        heading: "Can I choose the delivery date?",
        body: "Yes. You give a preferred date when ordering and we call the day before to confirm a two-hour window. You do not have to keep your whole day free.\n\nWhere delivery is handled by a freight carrier, they make contact directly, following their own procedures.",
      },
      {
        heading: "Where is the wood left, and what if access is difficult?",
        body: "Kerbside unloading is included in the price. We carry pallet trucks, so pallets can be taken through to your garage or storage bay.\n\nTell us about any narrow entrance, low gate, enclosed courtyard or parking restriction when you order and we will bring the right vehicle. Without that information the lorry turns up, and a wasted journey is still charged.",
      },
      {
        heading: "Can I order without creating an account?",
        body: "Yes. Ordering as a guest is possible and an account remains optional. An account simply saves you retyping your address and gives you access to your order history and invoices.",
      },
      {
        heading: "How do I track my order?",
        body: "The confirmation email contains a tracking link that works without signing in. If you have an account, “My orders” shows the same status.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* About                                                               */
  /* ------------------------------------------------------------------ */
  "a-propos": {
    slug: "a-propos",
    title: "About MLC Bois",
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: "What we sell",
        body: "Firewood that is ready to burn, kiln-dried, delivered by us. Beech, oak, birch and ash from French forests, in 25, 33 and 50 cm logs, alongside wood briquettes, ENplus A1 certified pellets and kindling.",
      },
      {
        heading: "Why kiln drying",
        body: "Air-dried wood takes two summers to fall below 20 % moisture content, and only if it is well stored. A kiln does the same job in 72 hours, in a controlled and verifiable way.\n\nThe difference is not cosmetic: the water in the wood has to evaporate before combustion yields usable heat. Wood at 30 % moisture loses close to half its calorific value to that evaporation, fouls the flue and blackens the glass.",
      },
      {
        heading: "Measured, not promised",
        body: "Every batch is measured before it leaves and the record accompanies the delivery. “Dry wood” means nothing without a figure attached; a moisture meter costs under €20 and settles any argument.",
      },
      {
        heading: "Our own logistics",
        body: "We deliver throughout mainland France, in two clearly distinct ways.\n\nIn Île-de-France we deliver ourselves, with our own trailer. No delivery notification card, no pallet sitting three days in a depot. We call the day before and give a two-hour window.\n\nAcross the rest of the country we ship on pallets by freight carrier: the service is then the carrier's, and we say so rather than let anyone assume otherwise.",
      },
      {
        heading: "Where the wood comes from",
        body: "Our wood comes from sustainably managed, PEFC-certified French forests. Local sourcing limits transport, which weighs heavily in the footprint of a product sold by volume.",
      },
      {
        heading: "Reaching us",
        body: `Monday to Friday from 8am to 5pm and Saturday from 9am to 1pm, on ${COMPANY.phone}. Whoever picks up knows the product: in this trade, one order in two is closed on the phone.`,
      },
      {
        heading: "Company details",
        body: `${COMPANY.name}, a single-shareholder simplified joint-stock company (SASU) with share capital of ${COMPANY.capital}, ${COMPANY.street}, ${COMPANY.city}. ${COMPANY.register}. VAT number: ${COMPANY.vatId}. Full details are in the legal notice.`,
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
        body: "For any question about an order, a lead time or a product, we are available Monday to Friday from 8am to 5pm and Saturday from 9am to 1pm.",
        list: [
          `Phone: ${COMPANY.phone} (standard rate)`,
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
        body: "The tracking link is in your confirmation email and works without signing in. If you have an account, “My orders” shows the same status. Keep the order number to hand: it speeds up any exchange.",
      },
      {
        heading: "Complaints",
        body: `Send complaints to ${COMPANY.email} quoting the order number and, if possible, photographs. We reply within two working days. The detailed procedure is on the “Returns & complaints” page.`,
      },
      {
        heading: "Trade and bulk orders",
        body: `Restaurants, bakeries, campsites, local authorities and property managers should write to ${COMPANY.email} with the subject “Trade”, stating the monthly volume envisaged and the delivery address. We reply the same working day with tiered pricing.`,
      },
      {
        heading: "Data protection",
        body: "Requests to access, rectify or erase your data go to confidentialite@mlc-bois.fr or by post to the registered office marked “Data protection”. We reply within the one-month period laid down by the GDPR.",
      },
      {
        heading: "Press and partnerships",
        body: `Press enquiries and partnership proposals should be sent to ${COMPANY.email} with the subject “Press” or “Partnership”.`,
      },
      {
        heading: "Company details",
        body: `${COMPANY.name}, represented by ${COMPANY.managingDirector}. ${COMPANY.register}. VAT number: ${COMPANY.vatId}. Full details are in the legal notice.`,
      },
    ],
  },
};
