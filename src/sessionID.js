import { createHash } from "crypto";

const lower = "abcdefghijklmnopqrstuvwxyz",
  upper = lower.toUpperCase(),
  numbers = "0123456789",
  symbols = "!@#$%^&*()_+{}|:<>?~";

export const generateSessionID = (numberPerCategory, numShuffles) => {
    const [idLower, idUpper, idNumbers, idSymbols] = [
      lower,
      upper,
      numbers,
      symbols,
    ].map((characterSet) =>
      selectRandomWithReplacement(characterSet.split(""), numberPerCategory),
    );
    return shuffle(
      [...idLower, ...idUpper, ...idNumbers, ...idSymbols],
      numShuffles,
    ).join("");
  },
  hash = (string) => createHash("sha256").update(string).digest("hex");
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
const shuffle = (inputArray, numShuffles) => {
    if (numShuffles === 0) return inputArray;
    if (numShuffles === undefined) numShuffles = 1;
    if (numShuffles < 1) throw "numShuffles must be >=1";
    const array = [...inputArray];
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return shuffle(array, numShuffles - 1);
  },
  selectRandom = (inputArray) =>
    inputArray[Math.floor(Math.random() * inputArray.length)],
  selectRandomWithReplacement = (inputArray, n) =>
    new Array(n).fill(undefined).map(() => selectRandom(inputArray));
