import type {
  AccountInsertValues,
  PreferenceInsertValues,
  ProfileInsertValues
} from "@/drizzle/types"

export const accountsData = [
  {
    role: "root",
    username: "root",
    email: "root@luminous.co",
    password: "p4ssw02d",
    isVerified: true,
    profile: {
      displayName: "display name",
      avatar: "/static/images/avatar/orange.jpg"
    },
    preferences: {}
  },
  {
    role: "admin",
    username: "admin",
    email: "admin@luminous.co",
    password: "p4ssw02d",
    isVerified: true,
    profile: {
      displayName: "display name",
      avatar: "/static/images/avatar/blue.jpg"
    },
    preferences: {}
  },
  {
    role: "user",
    username: "user",
    email: "user@luminous.co",
    password: "p4ssw02d",
    isVerified: true,
    profile: {
      displayName: "display name",
      avatar: "/static/images/avatar/green.jpg"
    },
    preferences: {}
  },
  {
    role: "user",
    username: "lumine",
    email: "lumine@luminous.co",
    password: "p4ssw02d",
    isVerified: true,
    profile: {
      displayName: "ルミナス・バレンタイン",
      avatar: "/static/images/lominous.webp",
      bio: "Luminous Valentine is a Demon Lord, the fifth seat of the Octagram, and the True Ruler of Holy Empire Ruberios. She is the ruler of all the vampires and one of the oldest demon lords."
    },
    preferences: {
      audioLanguage: null,
      autoplayNext: true,
      autoSkip: true
    }
  }
] as Array<
  AccountInsertValues & {
    profile: ProfileInsertValues
    preferences?: PreferenceInsertValues
  }
>
