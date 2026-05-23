/**
 * HealthClouda — Organisation Config
 * ─────────────────────────────────────────────────────────────
 * To onboard a new organisation, edit ONLY this file.
 * All asset paths are relative to the org/ subfolder.
 * ─────────────────────────────────────────────────────────────
 */

const ORG_CONFIG = {

  // Organisation identity
  name:      "Your Organisation",
  shortName: "YourOrg",
  slug:      "your-org",

  // Asset paths — relative to public/org/
  logo:      "/assets/images/unilogo.png",
  heroImage: "/assets/images/Frame 64.png",

  // Email placeholder shown in the sign-in input
  emailPlaceholder: "e.g. user@your-org.com",

  // Contact details
  clinic: {
    name:    "Organisation Clinic",
    address: "123 Main Street, Your City",
    hours:   "Mon–Sat, 8:00 AM – 6:00 PM",
    phone:   "+234 (0) 800 000 000",
    email:   "clinic@your-org.com",
  },
  support: {
    email: "support@healthclouda.com",
    chat:  "Live support (available weekdays 9 AM – 5 PM)",
  },
  emergency: {
    phone: "+234 (0) 800 000 001",
  },

  // Browser tab title
  pageTitle: "HealthClouda | Your Organisation",
};
