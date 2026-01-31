export interface BoardGameDefault {
  id: string;
  name: string;
  image: string;
  defaults: {
    type: "swiss" | "eliminatory" | "round_robin" | "catan" | "multigame" | "carcassonne";
    matchGenerationMode: "auto" | "manual";
    playersPerMatch: number;
    numberOfRounds?: number;
  } | null;
}

export const boardGameDefaults: BoardGameDefault[] = [
  {
    id: "catan",
    name: "Catan",
    image: "/assets/bordGames/catan.png",
    defaults: {
      type: "catan",
      matchGenerationMode: "auto",
      playersPerMatch: 4,
      numberOfRounds: 3,
    },
  },
  {
    id: "carcassonne",
    name: "Carcassonne",
    image: "/assets/bordGames/carcassone.png",
    defaults: {
      type: "carcassonne",
      matchGenerationMode: "auto",
      playersPerMatch: 2,
    },
  },
  {
    id: "others",
    name: "Others",
    image: "/assets/bordGames/others.png",
    defaults: null,
  },
];
