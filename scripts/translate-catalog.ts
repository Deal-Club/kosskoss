/**
 * Remplit les champs de traduction anglaise du catalogue (« *En ») à partir des
 * textes allemands de référence.
 *
 * Lancement : npx tsx scripts/translate-catalog.ts
 *
 * Règles suivies :
 *   - les marques et les références produit ne se traduisent jamais ;
 *   - les noms de technologies déposées (Home Connect, LatteGo, AutoDos…)
 *     restent tels quels ;
 *   - les décimales passent de la virgule allemande au point anglais
 *     (« 3,5 kW » -> « 3.5 kW ») ;
 *   - le script est idempotent : le relancer réécrit les mêmes valeurs.
 *
 * Les sections de guide sont appariées par position, comme à l'affichage.
 */
import { prisma } from "@/server/prisma";

interface GuideSectionTranslation {
  heading: string;
  body: string;
}

interface CategoryTranslation {
  label: string;
  description: string;
  guideIntro: string;
  guideClosing: string;
  sections: GuideSectionTranslation[];
}

// ---- Univers ----

const GROUPS: Record<string, string> = {
  haushalt: "Home Appliances",
  multimedia: "Multimedia",
};

// ---- Catégories et guides d'achat ----

const CATEGORIES: Record<string, CategoryTranslation> = {
  "haushalt/kaffeemaschinen": {
    label: "Coffee Machines",
    description: "Bean-to-cup and filter coffee machines for a perfect brew every morning.",
    guideIntro:
      "From the classic bean-to-cup machine to the compact portafilter — at Hausgeräte Pfeffer you will find the right solution for your perfect cup of coffee.",
    guideClosing:
      "Not sure which coffee machine suits how much coffee you drink? Our service team is happy to advise you personally.",
    sections: [
      {
        heading: "Bean-to-cup or portafilter machine?",
        body: "Bean-to-cup machines handle grinding, brewing and milk frothing at the touch of a button — ideal for everyday use. If you want full control over grind size, brew pressure and crema, go for a classic portafilter machine.",
      },
      {
        heading: "What to look for when buying",
        body: "Choose a conical burr grinder rather than a blade grinder for a more even grind, look for a straightforward automatic cleaning cycle, and check how many coffee specialities you can select.",
      },
      {
        heading: "Popular coffee machine brands",
        body: "De'Longhi, Siemens, Jura, Krups, Philips and Melitta are among the most sought-after manufacturers — you will find current models from all of them here, side by side.",
      },
    ],
  },
  "haushalt/waschmaschinen": {
    label: "Washing Machines",
    description: "Front loaders with high spin speeds, automatic dosing and quiet operation.",
    guideIntro:
      "Clean laundry, low energy consumption and quiet operation — our washing machines combine modern technology for every household.",
    guideClosing:
      "Questions about installation, dimensions or matching accessories? Our service team is glad to help.",
    sections: [
      {
        heading: "Front loader or top loader?",
        body: "Front loaders offer a larger drum volume and can be stacked with a tumble dryer. Top loaders need less floor space and are easy to load from above.",
      },
      {
        heading: "What to look for when buying",
        body: "The key figures are spin speed (at least 1,400 rpm for faster drying), the energy efficiency class, and special programmes such as mixed fabrics or sportswear.",
      },
      {
        heading: "Popular washing machine brands",
        body: "Samsung, Bosch, Siemens, LG, Miele and AEG all offer reliable models with smart app control and low water consumption.",
      },
    ],
  },
  "haushalt/geschirrspueler": {
    label: "Dishwashers",
    description: "Fully and semi-integrated dishwashers for every kitchen.",
    guideIntro:
      "Whether fully integrated or freestanding, a good dishwasher saves time, water and energy compared with washing up by hand.",
    guideClosing:
      "Unsure about the right built-in size? Contact our service team for free, no-obligation advice.",
    sections: [
      {
        heading: "Fully integrated, semi-integrated or freestanding?",
        body: "Fully integrated appliances disappear completely behind a cabinet door, semi-integrated models leave only the control panel visible, and freestanding models can be placed anywhere you like.",
      },
      {
        heading: "What to look for when buying",
        body: "Check the number of place settings, the water consumption per cycle, and practical extras such as a cutlery drawer and automatic detergent dosing.",
      },
      {
        heading: "Popular dishwasher brands",
        body: "Bosch, Siemens, Miele, AEG, Neff and Beko are among the most dependable manufacturers, known for long service life and quiet programmes.",
      },
    ],
  },
  "haushalt/staubsauger": {
    label: "Vacuum Cleaners",
    description: "Robot vacuums, cordless sticks and cylinder vacuums for effortless cleaning.",
    guideIntro:
      "From classic cylinder vacuums to nimble cordless sticks and fully autonomous robot vacuums — we have the right solution for every floor.",
    guideClosing:
      "Still wondering how much suction power your home needs? We are happy to advise you.",
    sections: [
      {
        heading: "Bagless, bagged or robot vacuum?",
        body: "Bagless models save on running costs, bagged vacuums keep emptying more hygienic, and robot vacuums clean fully automatically to a schedule.",
      },
      {
        heading: "What to look for when buying",
        body: "The essentials are suction power, battery life on cordless models, a HEPA filter for allergy sufferers, and suitability for both hard floors and carpets.",
      },
      {
        heading: "Popular vacuum cleaner brands",
        body: "iRobot, Dyson, Miele, Kärcher, Philips and Rowenta offer models for every need and every budget.",
      },
    ],
  },
  "haushalt/backoefen-herde": {
    label: "Ovens & Cookers",
    description: "Built-in ovens, cooker sets and hobs with pyrolytic cleaning and smart functions.",
    guideIntro:
      "From a built-in oven with pyrolytic self-cleaning to a complete cooker set — the right heat source for every kitchen.",
    guideClosing:
      "We are happy to advise you on built-in dimensions and the right hob to match your new oven.",
    sections: [
      {
        heading: "Built-in oven or cooker set?",
        body: "A separate built-in oven can be installed at eye level wherever you like, while a cooker set combines oven and hob in one space-saving unit.",
      },
      {
        heading: "What to look for when buying",
        body: "Consider cavity size, fan and hot-air functions, pyrolytic self-cleaning, and smart guided cooking programmes.",
      },
      {
        heading: "Popular oven and cooker brands",
        body: "Miele, Bosch, Siemens, AEG, Neff and Bauknecht stand out for durable engineering and intuitive controls.",
      },
    ],
  },
  "haushalt/kuechenmaschinen": {
    label: "Food Processors & Mixers",
    description: "Food processors and blenders for dough, smoothies and everything in between.",
    guideIntro:
      "Kneading, mixing, blending and more — a food processor takes a great deal of work out of everyday cooking.",
    guideClosing:
      "Questions about the right accessories for your food processor? Our service team is glad to help.",
    sections: [
      {
        heading: "Compact model or professional machine?",
        body: "Compact models suit occasional blending and small quantities, while professional food processors with a large bowl and a powerful motor handle heavy doughs with ease.",
      },
      {
        heading: "What to look for when buying",
        body: "The key factors are motor power, bowl capacity, the number of speed settings, and the tools supplied for mixing, kneading and slicing.",
      },
      {
        heading: "Popular food processor brands",
        body: "Philips, Bosch, KitchenAid, Kenwood, WMF and Krups are among the favourite brands of home cooks and professionals alike.",
      },
    ],
  },
  "haushalt/klimageraete": {
    label: "Air Conditioners",
    description: "Split and portable air conditioners for cooling and heating, with app control.",
    guideIntro:
      "Comfortable temperatures on hot days — our split and portable air conditioners help you keep a cool head in any room.",
    guideClosing:
      "Not sure how much cooling capacity you need? Our service team will gladly advise you on your room.",
    sections: [
      {
        heading: "Portable unit or fixed split system?",
        body: "Portable units work straight away with no installation, while split systems with a fixed outdoor unit run more quietly and more efficiently in continuous use.",
      },
      {
        heading: "What to look for when buying",
        body: "Match the cooling capacity in kW to your room size, check the energy efficiency rating, and consider extras such as dehumidifying and winter heating.",
      },
      {
        heading: "Popular air conditioning brands",
        body: "Daikin, LG, De'Longhi, Comfee, Klarstein and Panasonic offer dependable solutions for the home and the home office.",
      },
    ],
  },
  "multimedia/smartphones": {
    label: "Smartphones",
    description: "Current smartphone models with strong cameras and long battery life.",
    guideIntro:
      "From the camera to the battery life — compare current smartphones from all the major manufacturers here.",
    guideClosing:
      "Questions about the right storage size or accessories? Our service team is happy to advise you.",
    sections: [
      {
        heading: "Which operating system suits me?",
        body: "iOS wins on seamless integration with the Apple ecosystem, while Android offers a wider choice of manufacturers, price brackets and ways to customise your phone.",
      },
      {
        heading: "What to look for when buying",
        body: "The important criteria are screen size and technology, camera quality, battery capacity, internal storage and the guaranteed update period.",
      },
      {
        heading: "Popular smartphone brands",
        body: "Apple, Samsung, Google, Xiaomi, OnePlus and Sony are in a constant race over camera, performance and display.",
      },
    ],
  },
  "multimedia/videospiele": {
    label: "Video Games",
    description: "Controllers, headsets and accessories for console and PC.",
    guideIntro:
      "Controllers, headsets and gaming accessories for an even more immersive experience on console and PC.",
    guideClosing:
      "Not sure which accessories fit your console? Our service team is glad to help.",
    sections: [
      {
        heading: "Wired or wireless?",
        body: "Wireless controllers and headsets give you more freedom of movement, while wired accessories offer minimal latency and never need charging.",
      },
      {
        heading: "What to look for when buying",
        body: "Check compatibility with your platform, battery life on wireless devices, and extras such as haptic feedback or programmable buttons.",
      },
      {
        heading: "Popular gaming accessory brands",
        body: "Sony, Microsoft, Nintendo, Razer, Logitech and 8BitDo are among the best-known names for controllers and gaming accessories.",
      },
    ],
  },
  "multimedia/fernseher": {
    label: "TVs",
    description: "OLED, QLED and 4K televisions that bring the cinema home.",
    guideIntro:
      "OLED, QLED or LED — for a genuine cinema feel at home we stock current televisions in every common screen technology.",
    guideClosing:
      "Questions about the right screen size for your living room? Our service team is happy to advise you.",
    sections: [
      {
        heading: "OLED, QLED or LED?",
        body: "OLED televisions deliver perfect blacks and outstanding contrast, QLED wins on peak brightness, and classic LED models are the most affordable.",
      },
      {
        heading: "What to look for when buying",
        body: "Match the screen size to your viewing distance, and check the refresh rate for gaming, HDR support and the smart TV platform.",
      },
      {
        heading: "Popular television brands",
        body: "LG, Samsung, Sony, Philips, Panasonic and Hisense offer models for every budget and every requirement.",
      },
    ],
  },
  "multimedia/computer": {
    label: "Computers",
    description: "Laptops and desktop PCs for work, creativity and gaming.",
    guideIntro:
      "Whether a laptop for the road or a powerful desktop PC, you will find the right specification here for work, creative projects and gaming.",
    guideClosing:
      "Unsure about the right configuration? Our service team will gladly advise you personally.",
    sections: [
      {
        heading: "Laptop or desktop PC?",
        body: "Laptops win on mobility and a built-in battery, while desktop PCs offer more performance, easier upgrades and usually better value for money.",
      },
      {
        heading: "What to look for when buying",
        body: "Match the processor and memory to how you will use the machine, allow for enough SSD storage, and on laptops check battery life and screen quality.",
      },
      {
        heading: "Popular computer brands",
        body: "Apple, Dell, Lenovo, HP, Asus and Acer all offer machines for the office, creative work and gaming alike.",
      },
    ],
  },
  "multimedia/smartwatches": {
    label: "Smartwatches",
    description: "Fitness tracking, notifications and long battery life on your wrist.",
    guideIntro:
      "Fitness tracking, notifications and smart features right on your wrist — for an active, connected day.",
    guideClosing:
      "Questions about which smartwatch suits your operating system? Our service team is happy to advise you.",
    sections: [
      {
        heading: "Smartwatch or fitness tracker?",
        body: "Smartwatches offer app support, notifications and sometimes mobile connectivity, while pure fitness trackers win on longer battery life and a more compact design.",
      },
      {
        heading: "What to look for when buying",
        body: "The essentials are battery life, compatibility with your phone's operating system, water resistance, and health features such as heart-rate monitoring or ECG.",
      },
      {
        heading: "Popular smartwatch brands",
        body: "Garmin, Apple, Samsung, Fitbit, Withings and Amazfit offer models for serious athletes and everyday wear alike.",
      },
    ],
  },
  "multimedia/drohnen": {
    label: "Drones",
    description: "Camera drones with 4K recording, long flight times and obstacle sensing.",
    guideIntro:
      "Whether it is aerial footage on holiday, property photography or a first flight in the park — at Hausgeräte Pfeffer you will find camera drones for every use and every budget.",
    guideClosing:
      "Not sure which drone you may fly without a licence? Our service team will gladly advise you on classes, insurance and accessories.",
    sections: [
      {
        heading: "Under 250 g or a larger class?",
        body: "Drones with a take-off weight below 250 g fall into EU class C0 and may be flown without a remote pilot certificate — ideal for beginners and for travel. Heavier models offer larger sensors, better wind stability and longer range, but require registration and the EU proof of competency.",
      },
      {
        heading: "What to look for when buying",
        body: "What really matters is sensor size for good low-light footage, a mechanical 3-axis gimbal for shake-free video, the real flight time per battery, and obstacle sensing in several directions. A Fly More kit with spare batteries noticeably extends your flying day.",
      },
      {
        heading: "Popular drone brands",
        body: "DJI dominates the market with its Mini and Air series, Autel Robotics stands out for large sensors, HoverAir for self-flying compact cameras, and Potensic for affordable entry-level models.",
      },
    ],
  },
};

// ---- Produits : nom et arguments produit ----
// Indexés par slug ; la marque n'apparaît pas dans le nom et n'est donc jamais traduite.

const PRODUCTS: Record<string, { name: string; bullets: string[] }> = {
  "8bitdo-ultimate-controller-2-4g": {
    name: "Ultimate Controller 2.4G",
    bullets: ["Hall effect sticks", "Programmable buttons", "Charging dock included"],
  },
  "acer-swift-go-14-notebook": {
    name: "Swift Go 14 Laptop",
    bullets: ["Intel Core i5", "OLED display", "10 hours battery life"],
  },
  "aeg-6000-series-geschirrspueler": {
    name: "6000 Series Dishwasher",
    bullets: ["AirDry technology", "SoftGrip baskets", "60-minute programme"],
  },
  "aeg-6000-series-waschmaschine-7-kg": {
    name: "6000 Series Washing Machine, 7 kg",
    bullets: ["ÖkoMix technology", "SensiCare system", "Delay start timer"],
  },
  "aeg-surroundcook-einbaubackofen": {
    name: "SurroundCook Built-in Oven",
    bullets: ["SteamBake function", "Pyrolytic self-cleaning", "Full telescopic runners"],
  },
  "amazfit-gtr-4": {
    name: "GTR 4",
    bullets: ["AMOLED display", "Zepp OS", "14-day battery life"],
  },
  "apple-iphone-16-128-gb": {
    name: "iPhone 16, 128 GB",
    bullets: ['6.1" Super Retina display', "A18 chip", "Dual-camera system"],
  },
  "apple-macbook-air-13-m3": {
    name: 'MacBook Air 13" M3',
    bullets: ["8-core CPU", "18 hours battery life", "Liquid Retina display"],
  },
  "apple-watch-series-10": {
    name: "Watch Series 10",
    bullets: ["Largest Retina display yet", "Blood oxygen sensor", "Water resistant"],
  },
  "asus-rog-strix-gaming-notebook": {
    name: "ROG Strix Gaming Laptop",
    bullets: ["RTX 4060", "165 Hz display", "RGB keyboard"],
  },
  "autel-robotics-evo-lite-premium-bundle": {
    name: "EVO Lite+ Premium Bundle",
    bullets: ["1-inch CMOS sensor", "6K video recording", "Up to 40 minutes flight time"],
  },
  "bauknecht-einbauherd-set": {
    name: "BAK5 Built-in Cooker Set",
    bullets: ["Independent hob included", "4 cooking zones", "Aqua-Clean"],
  },
  "beko-geschirrspueler-teilintegrierbar": {
    name: "b300 Semi-integrated Dishwasher",
    bullets: ["AquaIntense", "EcoNightWash", "13 place settings"],
  },
  "bosch-geschirrspueler-vollintegrierbar": {
    name: "Serie 4 Fully Integrated Dishwasher",
    bullets: ["14 place settings", "Home Connect", "Energy efficiency class C"],
  },
  "bosch-mum5-kuechenmaschine": {
    name: "MUM5 Stand Mixer",
    bullets: ["1000 W motor", "3D PlanetaryMixing", "3.9 L stainless steel bowl"],
  },
  "bosch-serie-6-einbaubackofen": {
    name: "Serie 6 Built-in Oven",
    bullets: ["3D hot air", "PerfectBake", "Guided cooking programmes"],
  },
  "bosch-serie-6-waschmaschine-8-kg": {
    name: "Serie 6 Washing Machine, 8 kg",
    bullets: ["i-DOS automatic dosing", "AllergyPlus", "EcoSilence Drive"],
  },
  "comfee-mobiles-klimageraet-9000-btu": {
    name: "Eco Friendly Portable Air Conditioner, 9,000 BTU",
    bullets: ["App control", "Dehumidifier function", "Window kit included"],
  },
  "daikin-split-klimageraet-3-5-kw": {
    name: "Sensira Split Air Conditioner, 3.5 kW",
    bullets: ["Cooling & heating", "Wi-Fi ready", "Whisper-quiet operation"],
  },
  "de-longhi-magnifica-kaffeevollautomat": {
    name: "Magnifica Bean-to-Cup Coffee Machine",
    bullets: ["Conical burr grinder", "Milk frother", "5 drinks at the touch of a button"],
  },
  "de-longhi-mobiles-klimageraet": {
    name: "Pinguino Portable Air Conditioner",
    bullets: ["3-in-1 function", "Real Feel technology", "LED display"],
  },
  "dell-xps-13-notebook": {
    name: "XPS 13 Laptop",
    bullets: ["Intel Core Ultra 7", "16 GB RAM", "InfinityEdge display"],
  },
  "dji-air-3s": {
    name: "Air 3S",
    bullets: [
      "Dual camera with 1-inch sensor",
      "Up to 45 minutes flight time",
      "LiDAR night landing",
    ],
  },
  "dji-mini-4-pro-fly-more-combo": {
    name: "Mini 4 Pro Fly More Combo",
    bullets: [
      "Under 249 g take-off weight",
      "4K/60fps HDR video",
      "Omnidirectional obstacle sensing",
    ],
  },
  "dji-neo": {
    name: "Neo",
    bullets: ["Palm take-off, no controller needed", "4K ultra-wide angle", "Lightweight at 135 g"],
  },
  "dyson-v15-detect-akkusauger": {
    name: "V15 Detect Cordless Vacuum",
    bullets: ["Laser dust detection", "LCD display", "Up to 60 minutes run time"],
  },
  "fitbit-sense-2": {
    name: "Sense 2",
    bullets: ["Stress tracking", "6-day battery life", "Google integration"],
  },
  "garmin-venu-3-smartwatch": {
    name: "Venu 3 Smartwatch",
    bullets: ["AMOLED display", "14-day battery life", "Sleep & fitness tracking"],
  },
  "google-pixel-9-128-gb": {
    name: "Pixel 9, 128 GB",
    bullets: ["Tensor G4 chip", "Google AI features", '6.3" OLED display'],
  },
  "hisense-uled-65-4k-fernseher": {
    name: 'ULED 65" 4K TV',
    bullets: ["Quantum Dot technology", "Dolby Vision IQ", "Game Mode Pro"],
  },
  "hoverair-x1-pro": {
    name: "X1 Pro",
    bullets: ["Self-flying camera", "8K video", "Folds down to palm size"],
  },
  "hp-pavilion-desktop-pc": {
    name: "Pavilion Desktop PC",
    bullets: ["AMD Ryzen 7", "16 GB RAM", "512 GB SSD"],
  },
  "irobot-roomba-saugroboter-mit-wischfunktion": {
    name: "Roomba Robot Vacuum with Mopping",
    bullets: ["App control", "Self-emptying base", "Great on pet hair"],
  },
  "jura-ena-4-kaffeevollautomat": {
    name: "ENA 4 Bean-to-Cup Coffee Machine",
    bullets: ["Pulse Extraction Process", "P.E.P.® aroma", "Compact design"],
  },
  "kaercher-vc-6-bodenstaubsauger": {
    name: "VC 6 Cylinder Vacuum Cleaner",
    bullets: ["RotorTurbine", "Low noise level", "Bagless"],
  },
  "kenwood-chef-titanium-kuechenmaschine": {
    name: "Chef Titanium Stand Mixer",
    bullets: ["1400 W motor", "Planetary mixing action", "Extensive accessory set"],
  },
  "kitchenaid-artisan-kuechenmaschine": {
    name: "Artisan Stand Mixer",
    bullets: ["4.8 L stainless steel bowl", "10 speed settings", "Sturdy all-metal body"],
  },
  "klarstein-split-klimageraet-2-6-kw": {
    name: "Windwaker Split Air Conditioner, 2.6 kW",
    bullets: ["Eco mode", "Timer function", "Remote control included"],
  },
  "krups-evidence-kaffeevollautomat": {
    name: "Evidence Bean-to-Cup Coffee Machine",
    bullets: ["15 coffee specialities", "Quattro Force technology", "Automatic cleaning cycle"],
  },
  "krups-prep-cook-kuechenmaschine": {
    name: "Prep&Cook Food Processor",
    bullets: ["Cooking function up to 130°C", "4.5 L bowl", "Built-in scales"],
  },
  "lenovo-thinkpad-x1-carbon": {
    name: "ThinkPad X1 Carbon",
    bullets: ['14" 2.8K display', "Rugged carbon-fibre chassis", "Fast charging"],
  },
  "lg-ai-dd-waschmaschine-10-5-kg": {
    name: "AI DD Washing Machine, 10.5 kg",
    bullets: ["Direct Drive motor", "TurboWash 360°", "Wi-Fi control"],
  },
  "lg-dualcool-klimageraet": {
    name: "Dualcool Air Conditioner",
    bullets: ["Wi-Fi control", "Dual Inverter compressor", "Sleep mode"],
  },
  "lg-oled-evo-55-4k-fernseher": {
    name: 'OLED evo 55" 4K TV',
    bullets: ["120 Hz gaming", "Dolby Vision", "webOS Smart TV"],
  },
  "logitech-g29-lenkrad-mit-pedalen": {
    name: "G29 Racing Wheel with Pedals",
    bullets: ["Force feedback", "Genuine leather wheel", "PS/PC compatible"],
  },
  "melitta-caffeo-solo-kaffeevollautomat": {
    name: "Caffeo Solo Bean-to-Cup Coffee Machine",
    bullets: ["Conical burr grinder", "One-touch operation", "Aroma Extraction Technology"],
  },
  "microsoft-xbox-wireless-controller": {
    name: "Xbox Wireless Controller",
    bullets: ["Hybrid D-pad", "Textured grips", "Bluetooth compatible"],
  },
  "miele-complete-c3-bodenstaubsauger": {
    name: "Complete C3 Cylinder Vacuum Cleaner",
    bullets: ["HEPA filter", "Variable suction control", "Made in Germany"],
  },
  "miele-einbaubackofen-mit-pyrolyse": {
    name: "H 7000 Built-in Oven with Pyrolytic Cleaning",
    bullets: ["73 L cavity", "Fan Plus", "Self-cleaning"],
  },
  "miele-g-7000-geschirrspueler": {
    name: "G 7000 Dishwasher",
    bullets: ["AutoDos", "3D cutlery tray", "Made in Germany"],
  },
  "miele-w1-waschmaschine-8-kg": {
    name: "W1 Washing Machine, 8 kg",
    bullets: ["PowerWash system", "Honeycomb drum", "Made in Germany"],
  },
  "neff-n-50-geschirrspueler": {
    name: "N 50 Dishwasher",
    bullets: ["emotionLight", "Zeolith drying", "FlexRack Plus"],
  },
  "neff-slide-hide-einbaubackofen": {
    name: "Slide&Hide Built-in Oven",
    bullets: ["Retractable oven door", "CircoTherm", "VarioSteam"],
  },
  "nintendo-switch-pro-controller": {
    name: "Switch Pro Controller",
    bullets: ["Amiibo support", "Motion controls", "Built-in HD Rumble"],
  },
  "oneplus-12-256-gb": {
    name: "12, 256 GB",
    bullets: ["Hasselblad camera", "100 W SUPERVOOC charging", "Snapdragon 8 Gen 3"],
  },
  "panasonic-43-4k-fernseher": {
    name: 'MSW504 43" 4K TV',
    bullets: ["HDR10+", "Dolby Atmos", "Compact design"],
  },
  "panasonic-etherea-split-klimageraet": {
    name: "Etherea Split Air Conditioner",
    bullets: ["nanoeX air purification", "Whisper-quiet operation", "Wi-Fi ready"],
  },
  "philips-3000-series-saugroboter": {
    name: "3000 Series Robot Vacuum",
    bullets: ["App-based mapping", "AquaProtect", "Automatic recharging"],
  },
  "philips-ambilight-50-4k-fernseher": {
    name: 'Ambilight 50" 4K TV',
    bullets: ["3-sided Ambilight", "P5 Perfect Picture Engine", "Android TV"],
  },
  "philips-kuechenmaschine-1200-w": {
    name: "Viva Collection Food Processor, 1200 W",
    bullets: ["ProBlend 6 technology", "2 L glass jar", "Ice-crushing function"],
  },
  "philips-series-2200-kaffeevollautomat": {
    name: "Series 2200 Bean-to-Cup Coffee Machine",
    bullets: ["Classic milk system", "LatteGo", "5 coffee specialities"],
  },
  "potensic-atom-2": {
    name: "ATOM 2",
    bullets: ["Under 249 g take-off weight", "3-axis gimbal", "Up to 32 minutes flight time"],
  },
  "razer-kitty-edition-gaming-headset": {
    name: "Kitty Edition Gaming Headset",
    bullets: ["THX Spatial Audio", "Wireless design", "RGB lighting"],
  },
  "rowenta-x-force-flex-akkusauger": {
    name: "X-Force Flex Cordless Vacuum",
    bullets: ["3-in-1 cleaning", "Flexible joint", "LED headlights"],
  },
  "samsung-galaxy-s24-256-gb": {
    name: "Galaxy S24, 256 GB",
    bullets: ['6.2" Dynamic AMOLED', "Snapdragon 8 Gen 3", "Galaxy AI"],
  },
  "samsung-galaxy-watch-7": {
    name: "Galaxy Watch 7",
    bullets: ["BioActive sensor", "Wear OS", "Fall detection"],
  },
  "samsung-neo-qled-65-4k-fernseher": {
    name: 'Neo QLED 65" 4K TV',
    bullets: ["Quantum Matrix technology", "120 Hz gaming", "Tizen Smart TV"],
  },
  "samsung-quickdrive-waschmaschine-9-kg": {
    name: "QuickDrive Washing Machine, 9 kg",
    bullets: ["1,400 rpm spin speed", "AddWash door", "Wi-Fi control"],
  },
  "siemens-eq-6-plus-s700-kaffeevollautomat": {
    name: "EQ.6 plus s700 Bean-to-Cup Coffee Machine",
    bullets: ["OneTouch DoubleCup", "sensoFlow system", "iAroma system"],
  },
  "siemens-iq300-geschirrspueler": {
    name: "iQ300 Dishwasher",
    bullets: ["varioSpeed Plus", "Aqua sensor", "3 racks"],
  },
  "siemens-iq500-einbaubackofen": {
    name: "iQ500 Built-in Oven",
    bullets: ["coolStart", "activeClean", "Home Connect"],
  },
  "siemens-iq500-waschmaschine-9-kg": {
    name: "iQ500 Washing Machine, 9 kg",
    bullets: ["varioPerfect", "aquaStop", "Home Connect"],
  },
  "sony-bravia-xr-55-oled-fernseher": {
    name: 'Bravia XR 55" OLED TV',
    bullets: ["Cognitive Processor XR", "Acoustic Surface Audio", "Google TV"],
  },
  "sony-dualsense-wireless-controller": {
    name: "DualSense Wireless Controller",
    bullets: ["Haptic feedback", "Adaptive triggers", "Built-in microphone"],
  },
  "sony-xperia-1-vi-256-gb": {
    name: "Xperia 1 VI, 256 GB",
    bullets: ["4K display", "Zeiss optics", "Triple camera with zoom"],
  },
  "withings-scanwatch-2": {
    name: "ScanWatch 2",
    bullets: ["Hybrid analogue watch", "ECG function", "30-day battery life"],
  },
  "wmf-kult-x-kuechenmaschine": {
    name: "Kult X Blender",
    bullets: ["Compact design", "500 W motor", "Mix & Go bottle"],
  },
  "xiaomi-14t-256-gb": {
    name: "14T, 256 GB",
    bullets: ["Leica camera system", "120 W HyperCharge", '6.67" AMOLED'],
  },
};

// ---- Écriture en base ----

async function translateGroups(): Promise<number> {
  let updated = 0;

  for (const [slug, labelEn] of Object.entries(GROUPS)) {
    const result = await prisma.group.updateMany({ where: { slug }, data: { labelEn } });
    updated += result.count;
    if (result.count === 0) {
      console.warn(`  ! Univers introuvable : ${slug}`);
    }
  }

  return updated;
}

async function translateCategories(): Promise<{ categories: number; sections: number }> {
  const rows = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      group: { select: { slug: true } },
      guideSections: { select: { id: true }, orderBy: { position: "asc" } },
    },
  });

  let categories = 0;
  let sections = 0;

  for (const row of rows) {
    const key = `${row.group.slug}/${row.slug}`;
    const translation = CATEGORIES[key];

    if (!translation) {
      console.warn(`  ! Traduction manquante pour la catégorie : ${key}`);
      continue;
    }

    await prisma.category.update({
      where: { id: row.id },
      data: {
        labelEn: translation.label,
        descriptionEn: translation.description,
        guideIntroEn: translation.guideIntro,
        guideClosingEn: translation.guideClosing,
      },
    });
    categories += 1;

    // Appariement par position, exactement comme à l'affichage
    for (const [index, section] of row.guideSections.entries()) {
      const source = translation.sections[index];
      if (!source) {
        console.warn(`  ! Section ${index + 1} sans traduction pour ${key}`);
        continue;
      }

      await prisma.guideSection.update({
        where: { id: section.id },
        data: { headingEn: source.heading, bodyEn: source.body },
      });
      sections += 1;
    }
  }

  return { categories, sections };
}

async function translateProducts(): Promise<number> {
  const rows = await prisma.product.findMany({ select: { id: true, slug: true } });
  let updated = 0;

  for (const row of rows) {
    const translation = PRODUCTS[row.slug];

    if (!translation) {
      console.warn(`  ! Traduction manquante pour le produit : ${row.slug}`);
      continue;
    }

    await prisma.product.update({
      where: { id: row.id },
      data: {
        nameEn: translation.name,
        // Les listes sont stockées en JSON : SQLite ne gère pas les tableaux
        bulletsEn: JSON.stringify(translation.bullets),
      },
    });
    updated += 1;
  }

  return updated;
}

async function main() {
  console.log("Traduction du catalogue en anglais…\n");

  const groups = await translateGroups();
  console.log(`  Univers mis à jour        : ${groups}`);

  const { categories, sections } = await translateCategories();
  console.log(`  Catégories mises à jour   : ${categories}`);
  console.log(`  Sections de guide         : ${sections}`);

  const products = await translateProducts();
  console.log(`  Produits mis à jour       : ${products}`);

  console.log(`\nTotal : ${groups + categories + sections + products} lignes mises à jour.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
