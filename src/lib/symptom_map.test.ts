import { guessSymptom } from "./symptom_map";

describe("symptom_map", () => {
  it("maps wont start after brake reset -> topdrive.wont_start.v2", () => {
    const g = guessSymptom("Top Drive won't start after brake reset");
    expect(g.packKey).toBe("topdrive.wont_start.v2");
    expect(g.confidence).toBeGreaterThan(0.7);
  });

  it("handles common typo 'break reset'", () => {
    const g = guessSymptom("TopDrive wont start after break reset");
    expect(g.packKey).toBe("topdrive.wont_start.v2");
  });

  it("maps low rpm symptom -> topdrive.rpm.low.v2", () => {
    const g = guessSymptom("Top drive rpm is low");
    expect(g.packKey).toBe("topdrive.rpm.low.v2");
  });

  it("handles various won't start variations", () => {
    const variations = [
      "TopDrive won't start after brake reset",
      "TopDrive can't start after brake reset", 
      "TopDrive doesn't start after brake reset",
      "TopDrive isn't starting after brake reset",
      "TopDrive won't turn on after brake reset",
      "TopDrive won't power up after brake reset"
    ];
    
    variations.forEach(text => {
      const g = guessSymptom(text);
      expect(g.packKey).toBe("topdrive.wont_start.v2");
      expect(g.equipmentType).toBe("TopDrive");
      expect(g.failureMode).toBe("Won't Start");
    });
  });

  it("handles various brake reset variations", () => {
    const variations = [
      "TopDrive won't start after brake reset",
      "TopDrive won't start after break reset", // typo
      "TopDrive won't start after brake release",
      "TopDrive won't start after reset brake"
    ];
    
    variations.forEach(text => {
      const g = guessSymptom(text);
      expect(g.packKey).toBe("topdrive.wont_start.v2");
    });
  });

  it("handles TD11 and other TD variations", () => {
    const variations = [
      "TD11 won't start after brake reset",
      "TD5 won't start after brake reset",
      "topdrive won't start after brake reset"
    ];
    
    variations.forEach(text => {
      const g = guessSymptom(text);
      expect(g.packKey).toBe("topdrive.wont_start.v2");
    });
  });

  it("handles low rpm variations", () => {
    const variations = [
      "TopDrive rpm is low",
      "TopDrive has low rpm",
      "TopDrive insufficient rpm",
      "TopDrive rpm low"
    ];
    
    variations.forEach(text => {
      const g = guessSymptom(text);
      expect(g.packKey).toBe("topdrive.rpm.low.v2");
      expect(g.equipmentType).toBe("TopDrive");
      expect(g.failureMode).toBe("Low RPM");
    });
  });

  it("returns equipment only when no failure mode detected", () => {
    const g = guessSymptom("TopDrive issue");
    expect(g.equipmentType).toBe("TopDrive");
    expect(g.packKey).toBe(null);
    expect(g.confidence).toBe(0.5);
    expect(g.reason).toBe("equipment only");
  });

  it("returns no match for unrelated text", () => {
    const g = guessSymptom("Random text about nothing");
    expect(g.equipmentType).toBeUndefined();
    expect(g.packKey).toBe(null);
    expect(g.confidence).toBe(0.0);
    expect(g.reason).toBe("no match");
  });

  it("handles empty or null input", () => {
    const g1 = guessSymptom("");
    const g2 = guessSymptom(null as any);
    
    expect(g1.packKey).toBe(null);
    expect(g2.packKey).toBe(null);
    expect(g1.confidence).toBe(0.0);
    expect(g2.confidence).toBe(0.0);
  });
});
