/**
 * HealthClouda — Organisation Config
 * ─────────────────────────────────────────────────────────────
 * To onboard a new organisation, edit ONLY this file.
 * All asset paths are relative to the org/ subfolder.
 * ─────────────────────────────────────────────────────────────
 */

const ORG_CONFIG = {

  // Organisation identity
  name:      "University of Ilorin",
  shortName: "Unilorin",
  slug:      "unilorin",

  // Asset paths — relative to public/org/
  logo:      "../../assets/images/unilogo.png",
  heroImage: "../../assets/images/Frame 64.png",

  // Email placeholder shown in the sign-in input
  emailPlaceholder: "e.g. 242060045@unilorin.edu.ng",

  // Contact details
  clinic: {
    name:    "University Clinic",
    address: "Student Health Center, University of Ilorin",
    hours:   "Mon–Sat, 8:00 AM – 6:00 PM",
    phone:   "+234 (0) 803 123 456",
    email:   "clinic@unilorin.edu.ng",
  },
  support: {
    email: "support@healthclouda.com",
    chat:  "Live support (available weekdays 9 AM – 5 PM)",
  },
  emergency: {
    phone: "+234 (0) 802 555 0000",
  },

  // Browser tab title
  pageTitle: "HealthClouda | University of Ilorin",
};