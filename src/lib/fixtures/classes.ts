import type {
  ClassCatalogResponse,
  ClassSessionsResponse,
  DayOfWeek,
  Intensity,
  MgdClassSession,
} from "@/lib/mgd/types";

/**
 * Placeholder class data, shaped EXACTLY like the MyGymDesk Website API.
 *
 * Content is lifted from the approved design so the pages look right in
 * review. The shapes are the contract: Phase 2 replaces the fixture call in
 * src/lib/content.ts with `mgd().getClassCatalog()` and nothing downstream
 * changes.
 */

const UNSPLASH = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

interface ClassSeed {
  id: string;
  name: string;
  sport: string;
  intensity: Intensity;
  durationMin: number;
  price: number;
  description: string;
  image: string;
}

const CLASSES: ClassSeed[] = [
  {
    id: "cls-strength",
    name: "Strength Training",
    sport: "Strength",
    intensity: 3,
    durationMin: 60,
    price: 500,
    description:
      "Barbell fundamentals — squat, press, deadlift — coached in small groups.",
    image: UNSPLASH("1517836357463-d25dfeac3438", 700),
  },
  {
    id: "cls-hiit",
    name: "HIIT Circuit",
    sport: "Conditioning",
    intensity: 3,
    durationMin: 45,
    price: 400,
    description:
      "Ten stations, short rests. Built to wreck you in three quarters of an hour.",
    image: UNSPLASH("1594737625785-a6cbdabd333c", 700),
  },
  {
    id: "cls-zumba",
    name: "Zumba",
    sport: "Dance",
    intensity: 2,
    durationMin: 50,
    price: 350,
    description: "Latin and Bollywood sets. The loudest hour on the schedule.",
    image: UNSPLASH("1524594152303-9fd13543fe6e", 700),
  },
  {
    id: "cls-yoga",
    name: "Yoga & Mobility",
    sport: "Recovery",
    intensity: 1,
    durationMin: 60,
    price: 350,
    description:
      "Hip and shoulder work for people who sit all day and lift all evening.",
    image: UNSPLASH("1544367567-0f2fcb009e0b", 700),
  },
  {
    id: "cls-spin",
    name: "Spin",
    sport: "Cardio",
    intensity: 2,
    durationMin: 45,
    price: 400,
    description:
      "Interval rides on the bikes with power targets called from the front.",
    image: UNSPLASH("1534787238916-9ba6764efd4f", 700),
  },
  {
    id: "cls-functional",
    name: "Functional Conditioning",
    sport: "Conditioning",
    intensity: 3,
    durationMin: 55,
    price: 500,
    description:
      "Sleds, ropes, kettlebells and carries. Scored, but never a competition.",
    image: UNSPLASH("1533560904424-a0c61dc306fc", 700),
  },
  {
    id: "cls-beginner-barbell",
    name: "Beginner Barbell",
    sport: "Strength",
    intensity: 1,
    durationMin: 45,
    price: 350,
    description: "Empty-bar technique class for the first six weeks of lifting.",
    image: UNSPLASH("1526506118085-60ce8714f8c5", 700),
  },
  {
    id: "cls-core-stretch",
    name: "Core & Stretch",
    sport: "Recovery",
    intensity: 1,
    durationMin: 30,
    price: 250,
    description:
      "Thirty minutes of trunk work and guided stretching after work.",
    image: UNSPLASH("1518611012118-696072aa579a", 700),
  },
];

/**
 * Class artwork.
 *
 * `website-classes?resource=catalog` returns no image field, so these are a
 * website-side concern for good. Keyed by class name because that is the only
 * stable identifier shared between MGD and this map — MGD class-type UUIDs
 * differ per tenant. Unmatched classes fall back to the striped placeholder.
 */
export const CLASS_IMAGES: Record<string, string> = Object.fromEntries(
  CLASSES.map((c) => [c.name, c.image]),
);

export const CLASS_CATALOG_FIXTURE: ClassCatalogResponse = {
  classes: CLASSES.map((c) => ({
    id: c.id,
    name: c.name,
    sport: c.sport,
    intensity: c.intensity,
    durationMin: c.durationMin,
    description: c.description,
    capacity: 20,
    // Classes carry one price, so member == non-member.
    priceMember: c.price,
    priceNonMember: c.price,
    currency: "INR",
    // Class *types* are tenant-wide — always null, per the API contract.
    locationId: null,
    locationName: null,
  })),
};

// ---------------------------------------------------------------------------
// The weekly timetable
// ---------------------------------------------------------------------------

const INSTRUCTORS = {
  rahul: "Rahul Bisht",
  nash: "King Nash",
  harry: "Harry Singh",
  abhi: "Abhishek Guha",
} as const;

/** [startTime, class name, instructor, spotsBooked] */
type SlotSeed = [string, string, string, number];

/**
 * Indexed Monday-first to match how a human reads a timetable; converted to
 * MGD's Sunday-first `dayOfWeek` below.
 */
const WEEK_BY_LOCATION: Record<string, SlotSeed[][]> = {
  "vasant-kunj": [
    [
      ["06:00", "Strength Training", INSTRUCTORS.rahul, 14],
      ["08:00", "Yoga & Mobility", INSTRUCTORS.abhi, 9],
      ["18:30", "HIIT Circuit", INSTRUCTORS.nash, 20],
    ],
    [
      ["07:00", "Spin", INSTRUCTORS.harry, 12],
      ["10:00", "Beginner Barbell", INSTRUCTORS.rahul, 6],
      ["19:00", "Zumba", INSTRUCTORS.abhi, 17],
    ],
    [
      ["06:00", "Functional Conditioning", INSTRUCTORS.nash, 18],
      ["09:00", "Core & Stretch", INSTRUCTORS.abhi, 4],
      ["18:30", "Strength Training", INSTRUCTORS.rahul, 20],
    ],
    [
      ["07:00", "HIIT Circuit", INSTRUCTORS.nash, 11],
      ["11:00", "Yoga & Mobility", INSTRUCTORS.abhi, 7],
      ["19:00", "Spin", INSTRUCTORS.harry, 15],
    ],
    [
      ["06:00", "Strength Training", INSTRUCTORS.rahul, 16],
      ["08:30", "Zumba", INSTRUCTORS.abhi, 13],
      ["18:00", "Functional Conditioning", INSTRUCTORS.nash, 19],
    ],
    [
      ["08:00", "Beginner Barbell", INSTRUCTORS.rahul, 8],
      ["10:00", "HIIT Circuit", INSTRUCTORS.nash, 20],
      ["17:00", "Yoga & Mobility", INSTRUCTORS.abhi, 10],
    ],
    [
      ["09:00", "Core & Stretch", INSTRUCTORS.abhi, 5],
      ["11:00", "Spin", INSTRUCTORS.harry, 9],
    ],
  ],
  gurgaon: [
    [
      ["06:30", "Functional Conditioning", INSTRUCTORS.harry, 12],
      ["09:00", "Zumba", INSTRUCTORS.abhi, 15],
      ["19:00", "Strength Training", INSTRUCTORS.harry, 18],
    ],
    [
      ["07:00", "HIIT Circuit", INSTRUCTORS.abhi, 20],
      ["18:00", "Yoga & Mobility", INSTRUCTORS.abhi, 8],
    ],
    [
      ["06:30", "Strength Training", INSTRUCTORS.harry, 13],
      ["10:00", "Core & Stretch", INSTRUCTORS.abhi, 3],
      ["19:30", "Spin", INSTRUCTORS.harry, 16],
    ],
    [
      ["07:00", "Beginner Barbell", INSTRUCTORS.harry, 7],
      ["18:30", "HIIT Circuit", INSTRUCTORS.abhi, 19],
    ],
    [
      ["06:30", "Functional Conditioning", INSTRUCTORS.harry, 17],
      ["09:30", "Yoga & Mobility", INSTRUCTORS.abhi, 11],
      ["19:00", "Zumba", INSTRUCTORS.abhi, 20],
    ],
    [
      ["08:30", "Strength Training", INSTRUCTORS.harry, 14],
      ["11:00", "Spin", INSTRUCTORS.harry, 10],
    ],
    [["10:00", "Core & Stretch", INSTRUCTORS.abhi, 6]],
  ],
};

/** Monday-first index → MGD `dayOfWeek` (0 Sunday … 6 Saturday). */
function toDayOfWeek(mondayFirstIndex: number): DayOfWeek {
  return (((mondayFirstIndex + 1) % 7) as DayOfWeek);
}

export function classSessionsFixture(
  locationSlug: string,
): ClassSessionsResponse {
  const week = WEEK_BY_LOCATION[locationSlug];
  if (!week) return { sessions: [] };

  const sessions: MgdClassSession[] = [];

  week.forEach((day, dayIndex) => {
    const dayOfWeek = toDayOfWeek(dayIndex);
    for (const [startTime, name, instructorName, spotsBooked] of day) {
      const type = CLASSES.find((c) => c.name === name);
      if (!type) continue;

      const templateKey = `${dayOfWeek}-${startTime.replace(":", "")}-${type.id}`;
      sessions.push({
        // In the real API this is the next real occurrence and rolls forward.
        // The fixture keeps it stable, which is fine because Phase 1 does not
        // book anything.
        id: `ses-${locationSlug}-${templateKey}`,
        templateKey,
        dayOfWeek,
        startTime,
        durationMin: type.durationMin,
        name: type.name,
        sport: type.sport,
        instructorName,
        instructorAvatarUrl: null,
        intensity: type.intensity,
        spotsTotal: 20,
        spotsBooked,
        description: type.description,
        capacity: 20,
        priceMember: type.price,
        priceNonMember: type.price,
        currency: "INR",
        locationId: locationSlug,
        locationName: locationSlug,
      });
    }
  });

  // The API sorts by dayOfWeek then startTime; match it so consumers can rely
  // on the order without re-sorting.
  sessions.sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );

  return { sessions };
}
