export interface SiteContent {
  hero: {
    tagline: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    photoUrl?: string;
    videoUrl?: string;
    youtubeId?: string;
    mediaType?: "photo" | "video" | "youtube";
  };
  whySection: {
    heading: string;
    cards: {
      title: string;
      description: string;
      photoId: string;
      photoUrl?: string;
      videoUrl?: string;
      youtubeId?: string;
      mediaType?: "photo" | "video" | "youtube";
    }[];
  };
  amenities: {
    heading: string;
    items: {
      icon: string;
      title: string;
      description: string;
      photoUrl?: string;
      videoUrl?: string;
      youtubeId?: string;
      mediaType?: "photo" | "video" | "youtube";
    }[];
  };
  attractions: {
    heading: string;
    items: {
      name: string;
      description: string;
      distance: string;
      travelTime: string;
      photoId: string;
      photoUrl?: string;
      videoUrl?: string;
      youtubeId?: string;
      mediaType?: "photo" | "video" | "youtube";
    }[];
  };
  faq: {
    heading: string;
    items: { question: string; answer: string }[];
  };
  trustStrip: { label: string; value: string }[];
  featuredUnitIds: string[];
  galleryPhotoIds: string[];
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    tagline: "SERIN TAGAYTAY STAYCATION",
    headline: "Escape to the Heart of Tagaytay",
    subheadline:
      "Premium staycation suites in Serin West and Serin East — stunning views, cool mountain air, and the comfort of a luxury retreat.",
    primaryCta: "Book Your Stay",
    secondaryCta: "Explore Suites",
  },
  whySection: {
    heading: "Why Guests Love Serin",
    cards: [
      {
        title: "Wake up to the caldera",
        description:
          "Select suites face the Taal Volcano caldera — a view you won't find in any hotel at this price.",
        photoId: "",
      },
      {
        title: "Your own private kitchen",
        description:
          "Every unit has a fully equipped kitchen — cook your Mahogany Market haul, brew coffee at sunrise.",
        photoId: "",
      },
      {
        title: "Steps from everything",
        description:
          "Walk to Ayala Malls Serin, Sky Ranch, restaurants and cafés — no car needed for a full Tagaytay day.",
        photoId: "",
      },
    ],
  },
  amenities: {
    heading: "Everything You Need",
    items: [
      { icon: "pool", title: "Swimming Pool", description: "Outdoor pool with mountain views" },
      { icon: "garden", title: "Sky Garden", description: "Rooftop garden with panoramic scenery" },
      { icon: "dumbbell", title: "Fitness Gym", description: "Building gym for your workout routine" },
      { icon: "tv", title: "Netflix & Smart TV", description: "Stream your favorites on every unit" },
      { icon: "wifi", title: "High-Speed Wi-Fi", description: "Fast internet throughout the building" },
      { icon: "chef-hat", title: "Equipped Kitchen", description: "Cook your own meals with full amenities" },
      { icon: "snowflake", title: "Air Conditioning", description: "Climate control in every room" },
      { icon: "shield-lock", title: "Secure Access", description: "Key card building entry and CCTV" },
    ],
  },
  attractions: {
    heading: "Discover Tagaytay",
    items: [
      {
        name: "Ayala Malls Serin",
        description: "Shopping, dining, and entertainment right next door",
        distance: "50m",
        travelTime: "1 min walk",
        photoId: "",
      },
      {
        name: "Sky Ranch",
        description: "Tagaytay's iconic amusement park with the tallest Ferris wheel",
        distance: "200m",
        travelTime: "3 min walk",
        photoId: "",
      },
      {
        name: "Mahogany Market",
        description: "Famous bulalo and fresh produce market",
        distance: "2.5 km",
        travelTime: "8 min drive",
        photoId: "",
      },
      {
        name: "Crosswinds",
        description: "Swiss-inspired luxury resort with pine trees and cool air",
        distance: "4 km",
        travelTime: "12 min drive",
        photoId: "",
      },
      {
        name: "People's Park in the Sky",
        description: "Scenic viewpoint overlooking Taal Lake and volcano",
        distance: "3 km",
        travelTime: "10 min drive",
        photoId: "",
      },
      {
        name: "Pink Sisters Chapel",
        description: "Beautiful pink chapel perfect for quiet reflection",
        distance: "5 km",
        travelTime: "15 min drive",
        photoId: "",
      },
    ],
  },
  faq: {
    heading: "Frequently Asked Questions",
    items: [
      {
        question: "What time is check-in and check-out?",
        answer:
          "Check-in is at 2:00 PM and check-out is at 12:00 PM (noon). Early check-in or late check-out may be arranged subject to availability.",
      },
      {
        question: "Is parking available?",
        answer:
          "Yes, the building has designated parking spaces for guests. Parking is available on a first-come, first-served basis.",
      },
      {
        question: "Are pets allowed?",
        answer:
          "Unfortunately, pets are not allowed in the building as per the condominium rules and regulations.",
      },
      {
        question: "How do I pay for my booking?",
        answer:
          "We accept GCash and bank transfers (BDO, BPI). Full payment is required to confirm your reservation. You'll upload your proof of payment during the booking process.",
      },
      {
        question: "What is your cancellation policy?",
        answer:
          "Cancellations made 7 days or more before check-in receive a full refund. Cancellations within 7 days are subject to a 50% charge. No-shows are charged in full.",
      },
      {
        question: "Do you provide towels and linens?",
        answer:
          "Yes, all units come with fresh towels, bed linens, pillows, and blankets. We also provide basic toiletries.",
      },
      {
        question: "Is there a minimum stay requirement?",
        answer:
          "The minimum stay is 1 night. However, during peak seasons and holidays, a 2-night minimum may apply.",
      },
      {
        question: "Can I request extra guests beyond the capacity?",
        answer:
          "Additional guests beyond the base capacity can be accommodated up to the maximum limit, subject to an extra guest fee per night.",
      },
    ],
  },
  trustStrip: [
    { label: "Five-star reviews", value: "150+" },
    { label: "Happy guests", value: "1,000+" },
    { label: "Prime Tagaytay location", value: "Serin" },
  ],
  featuredUnitIds: ["west-1-210", "west-1-906", "west-2-201"],
  galleryPhotoIds: [],
};
