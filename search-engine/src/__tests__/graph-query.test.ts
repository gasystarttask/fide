import { describe, expect, it } from "vitest";
import { extractGraphEntityQuery } from "../app/services/graphQuery";

describe("extractGraphEntityQuery", () => {
  it("extracts the subject from french who-is questions", () => {
    expect(extractGraphEntityQuery("Qui est David?"))?.toBe("David");
  });

  it("extracts the subject from english who-is questions", () => {
    expect(extractGraphEntityQuery("Who is Jesus?"))?.toBe("Jesus");
  });

  it("returns null when there is no recognizable subject pattern", () => {
    expect(extractGraphEntityQuery("Donne-moi un resume de 1 Samuel 17")).toBeNull();
  });
});