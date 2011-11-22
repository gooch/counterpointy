INSERT INTO Points SET hash = "cc", text = "Climate change is a real problem.";
INSERT INTO Points SET hash = "seaice", text = "Polar bears drown due to receeding sea ice.";
INSERT INTO Points SET hash = "storm", text = "Polar bears drown due to storms.";
INSERT INTO Points SET hash = "paper", text = "Scientific paper http://...";

INSERT INTO Reasons SET
  reason_hash = "supports1",
  premise_hash = "seaice",
  conclusion_hash = "cc",
  supports = TRUE;

INSERT INTO Reasons SET
  reason_hash = "supports2",
  premise_hash = "paper",
  conclusion_hash = "seaice",
  supports = TRUE;

INSERT INTO Reasons SET
  reason_hash = "supports3",
  premise_hash = "paper",
  conclusion_hash = "storm",
  supports = TRUE;

INSERT INTO Reasons SET
  reason_hash = "opposes1",
  premise_hash = "storm",
  conclusion_hash = "seaice",
  supports = FALSE;
