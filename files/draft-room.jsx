import React, { useState, useMemo, useRef, useEffect } from "react";

// Global stylesheet — font import plus the shared visual polish (shadows,
// hover/focus motion, scrollbar, keyframes) applied app-wide via plain CSS
// selectors, so individual inline styles don't need to repeat it everywhere.
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #26303f; border-radius: 8px; }
  ::-webkit-scrollbar-thumb:hover { background: #34415a; }
  button { transition: transform .15s ease, filter .15s ease, box-shadow .2s ease, background-color .15s ease; }
  button:not(:disabled) { cursor: pointer; }
  button:not(:disabled):hover { filter: brightness(1.12); transform: translateY(-1px); }
  button:not(:disabled):active { filter: brightness(0.94); transform: translateY(0); }
  button:disabled { cursor: not-allowed; }
  input, textarea { transition: box-shadow .15s ease, border-color .15s ease; }
  input:focus, textarea:focus, select:focus { outline: none; box-shadow: 0 0 0 3px rgba(57,255,136,0.18); }
  a { transition: opacity .15s ease; }
  a:hover { opacity: 0.8; }
  .diq-card { box-shadow: 0 4px 24px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.35); }
  .diq-row { transition: background-color .15s ease, box-shadow .15s ease, transform .15s ease; }
  .diq-row:hover { background-color: #161f2e !important; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
  .diq-hover-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.4); }
  .diq-quickpick:focus-within { box-shadow: 0 0 0 4px rgba(255,210,63,0.16); }
  .diq-pulse { animation: diqPulse 2.2s ease-in-out infinite; }
  @keyframes diqPulse {
    0%, 100% { box-shadow: 0 4px 24px rgba(57,255,136,0.22); }
    50% { box-shadow: 0 4px 34px rgba(57,255,136,0.45); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];
const POS_COLORS = {
  QB: "#e63946", RB: "#2a9d8f", WR: "#e9a23b",
  TE: "#8338ec", K: "#6c757d", DST: "#118ab2",
};
const DEFAULT_ROSTER = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 6 };

// Injury-history research compiled by background research agents (Aug 2026)
// from public sources — ESPN, Pro Football Reference, Wikipedia player pages,
// FantasyPros injury roundups, and team beat reporting. These are SUGGESTIONS
// only, surfaced for your review — nothing here is applied as a 🩹 flag until
// you accept it. "Games missed" figures are approximate reconstructions, not
// official tallies; treat Medium-confidence entries as worth a spot-check.
const INJURY_RESEARCH = [
  { name: "J.K. Dobbins", team: "DEN", pos: "RB", pattern: "recurring", confidence: "High",
    summary: "Chronic lower-body injury run: torn ACL (2021), knee injuries (2022), torn Achilles (2023, missed season), MCL sprain (2024, ~4 games), Lisfranc foot fracture (2025, missed season).", source: "Wikipedia" },
  { name: "Nick Chubb", team: "HOU", pos: "RB", pattern: "recurring", confidence: "High",
    summary: "Season-ending multi-ligament knee injury in 2023, then a season-ending broken foot in 2024 — two straight years of catastrophic lower-leg injuries before a healthy 2025.", source: "Wikipedia" },
  { name: "Austin Ekeler", team: "WAS", pos: "RB", pattern: "recurring", confidence: "High",
    summary: "High-ankle sprain (2023), two separate concussions (2024), ruptured Achilles Week 2 2025 — escalating pattern across three straight seasons.", source: "Wikipedia" },
  { name: "James Conner", team: "ARI", pos: "RB", pattern: "recurring", confidence: "High",
    summary: "Knee injury cost ~6 games in 2023; a foot injury in Week 3 2025 required surgery and ended his season.", source: "Wikipedia" },
  { name: "Aaron Jones", team: "MIN", pos: "RB", pattern: "recurring", confidence: "High",
    summary: "Hamstring strain cost ~5 games in 2023 and a separate hamstring injury cost ~6 games in 2025 — same body part recurring, healthy 2024 in between.", source: "Wikipedia" },
  { name: "Christian McCaffrey", team: "SF", pos: "RB", pattern: "recurring", confidence: "Medium-High",
    summary: "Healthy 2023 and 2025, but lost 6 games in 2024 to Achilles tendonitis then a PCL injury. Longer history of soft-tissue issues outside this window.", source: "Wikipedia" },
  { name: "Alvin Kamara", team: "NO", pos: "RB", pattern: "recurring", confidence: "Medium",
    summary: "Missed the final 3 games of 2024 with a groin injury, then the final 6 games of 2025 with an MCL sprain — different soft-tissue issues, back-to-back years.", source: "Wikipedia" },
  { name: "Isiah Pacheco", team: "KC", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "Fractured fibula in Week 2 2024, ~9 weeks on IR. Fully healthy 2023 and 2025 otherwise — isolated incident.", source: "Wikipedia" },
  { name: "Najee Harris", team: "LAC", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "Tore his Achilles in Week 3 of his first Chargers season (2025), ending his year after 3 games. Fully healthy 2023-2024 with Pittsburgh.", source: "Wikipedia" },
  { name: "Zach Charbonnet", team: "SEA", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "Season-ending ACL tear during the January 2026 playoffs. Fully healthy through the 2023-2025 regular seasons otherwise.", source: "Wikipedia" },
  { name: "Joe Mixon", team: "HOU", pos: "RB", pattern: "single-major", confidence: "Medium",
    summary: "Missed the entire 2025 season with a leg injury after a 3-game absence in 2024 with an ankle issue; released following the lost season.", source: "Wikipedia" },
  { name: "Cooper Kupp", team: "SEA", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Hamstring cost ~5 games to start 2023 (opened on IR); ankle injury cost 4 games in 2024. Two straight years of lower-body absences.", source: "Wikipedia" },
  { name: "Tee Higgins", team: "CIN", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Chronic hamstring issue dating to college: missed games to open 2024 with a hamstring strain, then more with a high ankle sprain; hamstring flared again in 2025 camp.", source: "search aggregate" },
  { name: "Chris Godwin", team: "TB", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Fractured/dislocated ankle in 2024 required surgery and ended his season early; hamstring issue delayed his 2025 start. Career-long ankle/foot pattern.", source: "FantasyPros" },
  { name: "A.J. Brown", team: "PHI", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Hamstring strain cost 3 games in 2024; the same hamstring flared again in 2025, costing roughly 3 more games.", source: "Wikipedia" },
  { name: "Chris Olave", team: "NO", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Documented concussion history — one in 2023, two more plus an additional head injury in 2024 (missed 9 games), roughly 5 concussions across 3 seasons. Fully healthy 2025.", source: "search aggregate" },
  { name: "Tank Dell", team: "HOU", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Fractured fibula ended his 2023 season; a multi-ligament knee dislocation ended his 2024 season; missed all of 2025 still recovering.", source: "Wikipedia" },
  { name: "Mike Evans", team: "TB", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Hamstring re-aggravation cost time in 2024; hamstring again in Week 3 2025, then a broken clavicle in Week 7 2025 limited him to 8 total games.", source: "Wikipedia" },
  { name: "Christian Watson", team: "GB", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Recurring hamstring strains across multiple seasons plus a torn ACL — roughly 20 games missed over 4 years.", source: "FantasyPros" },
  { name: "Nico Collins", team: "HOU", pos: "WR", pattern: "recurring", confidence: "Medium",
    summary: "Calf injury cost 2 games in 2023; hamstring cost 5 games in 2024; a concussion cost 1 game in 2025 — an absence in all three seasons.", source: "search aggregate" },
  { name: "Puka Nacua", team: "LAR", pos: "WR", pattern: "recurring", confidence: "Medium",
    summary: "Grade 2 PCL knee sprain cost 5 games in 2024; ankle sprain cost 1 game in 2025 — lower-body recurrence, though 2025 was minor.", source: "Draft Sharks" },
  { name: "Rashee Rice", team: "KC", pos: "WR", pattern: "recurring", confidence: "Medium",
    summary: "Season-ending knee injury (LCL + hamstring surgery) in 2024; lingering concussion symptoms ended his 2025 on IR. A 6-game suspension in 2025 complicates the picture.", source: "Wikipedia" },
  { name: "Diontae Johnson", team: "FA", pos: "WR", pattern: "recurring", confidence: "Medium",
    summary: "Hamstring injury opened 2023 (~1 month on IR); oblique injury limited stretches of 2024 — different soft-tissue injuries, back-to-back years.", source: "Wikipedia" },
  { name: "Malik Nabers", team: "NYG", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Torn ACL and meniscus ended his 2025 season after a hot start. First major injury of his career.", source: "FantasyPros" },
  { name: "Brandon Aiyuk", team: "SF", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Torn ACL and MCL in Week 7 2024 ended that season after 7 games; recovery extended through all of 2025.", source: "Wikipedia" },
  { name: "Stefon Diggs", team: "NE", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Non-contact torn ACL in Week 8 2024 ended that season after 8 games. Fully productive and durable through 2025 with New England.", source: "Wikipedia" },
  { name: "Tyreek Hill", team: "MIA", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Catastrophic dislocated knee with multiple torn ligaments (including the ACL) in Week 4 2025 — season-ending. Was an iron man in 2023-2024 otherwise.", source: "Wikipedia" },
  { name: "Rashid Shaheed", team: "NO", pos: "WR", pattern: "single-major", confidence: "Medium",
    summary: "Season-ending meniscus surgery in October 2024 limited him to 6 games that season. Healthy in 2023 and reportedly 2025.", source: "Wikipedia" },
  { name: "Anthony Richardson", team: "IND", pos: "QB", pattern: "recurring", confidence: "High",
    summary: "AC joint (throwing shoulder) surgery ended 2023 early; shoulder flared again in 2024 before a separate orbital fracture ended that season early too.", source: "ESPN" },
  { name: "Trevor Lawrence", team: "JAX", pos: "QB", pattern: "recurring", confidence: "High",
    summary: "Played through concussion, shoulder sprain, and high-ankle sprain in 2023; a Week 13 2024 concussion ended that season, plus a separate shoulder injury needing Dec 2024 surgery.", source: "ESPN" },
  { name: "Tua Tagovailoa", team: "MIA", pos: "QB", pattern: "recurring", confidence: "High",
    summary: "Multiple documented concussions in 2022 (including a Grade 3), then another Grade 2 concussion in Sept 2024 that landed him on IR.", source: "Wikipedia" },
  { name: "Joe Burrow", team: "CIN", pos: "QB", pattern: "recurring", confidence: "High",
    summary: "Season-ending right wrist injury in 2023 (~7 games); Grade 3 turf toe requiring surgery in Week 3 2025 (9 games).", source: "ESPN" },
  { name: "Kyler Murray", team: "ARI", pos: "QB", pattern: "recurring", confidence: "High",
    summary: "ACL tear (late 2022) limited him into 2023; lingering knee in 2024; foot injury ended 2025 after Week 5 (~12 games).", source: "team reports" },
  { name: "Dak Prescott", team: "DAL", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "Hamstring avulsion (torn off the bone) in Nov 2024 required season-ending surgery.", source: "ESPN" },
  { name: "Kirk Cousins", team: "ATL", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "Season-ending right Achilles rupture in Week 8 2023; the leg reportedly never felt fully normal through 2024.", source: "team reports" },
  { name: "Mark Andrews", team: "BAL", pos: "TE", pattern: "recurring", confidence: "High",
    summary: "Ankle fracture/ligament damage in Nov 2023 ended that season; a second ankle injury (hip-drop tackle) in 2025 cost the final 6 games plus a playoff game.", source: "ESPN" },
  { name: "George Kittle", team: "SF", pos: "TE", pattern: "recurring", confidence: "High",
    summary: "Groin/core-muscle issues through 2023; recurring hamstring problems in 2024; a Grade 3 hamstring tear cost 5 games in 2025 plus late-season ankle sprains.", source: "fantasy trackers" },
  { name: "Dallas Goedert", team: "PHI", pos: "TE", pattern: "recurring", confidence: "Medium-High",
    summary: "Fractured shoulder (2022), fractured forearm requiring surgery (2023, limited to 14 games), and another IR stint in Dec 2024.", source: "beat reports" },
  { name: "Dalton Kincaid", team: "BUF", pos: "TE", pattern: "recurring", confidence: "Medium-High",
    summary: "PCL injury in Week 10 2024 cost significant time; the same knee lingered into 2025 alongside a new Grade 2 hamstring strain.", source: "beat reports" },
  { name: "T.J. Hockenson", team: "MIN", pos: "TE", pattern: "single-major", confidence: "High",
    summary: "Combined ACL and MCL tear in Dec 2023 ended that season and cost the first 8 games of 2024.", source: "team reports" },
  { name: "Zach Ertz", team: "WAS", pos: "TE", pattern: "single-major", confidence: "High",
    summary: "Torn right ACL on Dec 7, 2025 — season-ending. No other major injury in this window besides a 2023 quad IR stint with Arizona.", source: "Wikipedia" },
  // Follow-up research round (RB/WR depth + rookie-sophomore QBs) — Aug 2026.
  { name: "Jonathon Brooks", team: "CAR", pos: "RB", pattern: "recurring", confidence: "High",
    summary: "Tore his ACL in college (2023); returned in the NFL in 2024, then suffered a second tear to the same right knee in Week 14 2024 (season-ending); spent all of 2025 on PUP recovering.", source: "Wikipedia" },
  { name: "Trey Benson", team: "ARI", pos: "RB", pattern: "single-major", confidence: "Medium-High",
    summary: "Ankle injury ended 2024 early; meniscus tear/surgery in Week 4 2025 ruled him out for the rest of that season too. Only 2 NFL seasons, but both were largely lost.", source: "Wikipedia" },
  { name: "MarShawn Lloyd", team: "GB", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "2024 mostly lost to IR and an appendicitis-related illness; 2025 lost almost entirely to IR as well. Two-for-two NFL seasons wiped out.", source: "Wikipedia" },
  { name: "Bucky Irving", team: "TB", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "Ankle and shoulder injuries cost him roughly 7 games in 2025 (his 2nd NFL season); rookie 2024 was clean.", source: "Wikipedia" },
  { name: "Omarion Hampton", team: "LAC", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "Ankle injury in Week 5 of his rookie 2025 season cost roughly 8 games before he returned in Week 14.", source: "Wikipedia" },
  { name: "Cam Skattebo", team: "NYG", pos: "RB", pattern: "single-major", confidence: "High",
    summary: "Dislocated his ankle in Week 8 of his rookie 2025 season — ended his year after just 8 games played.", source: "Wikipedia" },
  { name: "Braelon Allen", team: "NYJ", pos: "RB", pattern: "single-major", confidence: "Medium-High",
    summary: "MCL injury in Week 4 of his 2nd NFL season (2025) ruled him out 8-12 weeks and landed him on IR. Rookie 2024 was clean.", source: "Wikipedia" },
  { name: "Blake Corum", team: "LAR", pos: "RB", pattern: "single-major", confidence: "Medium",
    summary: "Fractured his forearm in Week 18 of his rookie 2024 season, ending that season/playoffs early.", source: "Wikipedia" },
  { name: "Jerome Ford", team: "CLE", pos: "RB", pattern: "single-major", confidence: "Medium",
    summary: "Shoulder injury in Week 14 2025 landed him on IR, missing the final ~4 games of that season. 2023-2024 were clean.", source: "Wikipedia" },
  { name: "Christian Kirk", team: "HOU", pos: "WR", pattern: "recurring", confidence: "High",
    summary: "Core muscle injury cost the final ~5 games of 2023; a broken collarbone cost roughly 9 games in 2024. Different injury types, but significant time lost in 2 of the last 3 seasons.", source: "Wikipedia" },
  { name: "Terry McLaurin", team: "WAS", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Quad injury in Week 3 2025 cost 4 games — then he re-aggravated the same quad on his return, costing additional time. Recurrence risk within the same body part.", source: "Wikipedia" },
  { name: "Calvin Ridley", team: "TEN", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Broke his fibula Nov 16 2025 (carted off), ending that season after 7 games. Fully healthy 2023-2024.", source: "Wikipedia" },
  { name: "Jayden Reed", team: "GB", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Fractured his collarbone plus a Jones fracture in his foot in Week 2 2025, requiring surgery and costing roughly 8 weeks.", source: "Wikipedia" },
  { name: "Drake London", team: "ATL", pos: "WR", pattern: "single-major", confidence: "Medium-High",
    summary: "PCL sprain in his left knee cost roughly 4-5 games in 2025. Fully healthy 2023-2024.", source: "Wikipedia" },
  { name: "Tutu Atwell", team: "LAR", pos: "WR", pattern: "single-major", confidence: "Medium",
    summary: "Hamstring injury cost roughly 7-8 games in 2025 (IR late Oct, activated mid-Dec). No missed-game issues in 2023-2024.", source: "Wikipedia" },
  { name: "Romeo Doubs", team: "GB", pos: "WR", pattern: "single-major", confidence: "Medium",
    summary: "Two documented concussions within a short span in 2024 (regular season and playoffs) — a concussion-recurrence watch even though he didn't miss the games-threshold.", source: "Wikipedia" },
  { name: "Marvin Harrison Jr.", team: "ARI", pos: "WR", pattern: "single-major", confidence: "Medium-High",
    summary: "Only 2 NFL seasons. 2025 was injury-stacked: a concussion, an appendectomy, then a heel injury and a foot injury that ended his season on IR after just 12 games.", source: "Wikipedia" },
  { name: "Rome Odunze", team: "CHI", pos: "WR", pattern: "single-major", confidence: "Medium",
    summary: "Foot injury cost roughly 5 games in his 2nd NFL season (2025). Rookie 2024 was clean.", source: "Wikipedia" },
  { name: "Travis Hunter", team: "JAX", pos: "WR", pattern: "single-major", confidence: "High",
    summary: "Tore the LCL in his knee in his rookie 2025 season (Oct 30), needed surgery, and was ruled out for the rest of that season after 7 games.", source: "Wikipedia" },
  { name: "Ricky Pearsall", team: "SF", pos: "WR", pattern: "single-major", confidence: "Medium",
    summary: "PCL injury in Week 5 of his 2nd NFL season (2025) cost several games; also opened that season on PUP for a hamstring issue.", source: "Wikipedia" },
  { name: "Bo Nix", team: "DEN", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "Broke his right ankle in the Jan 17 2026 playoff loss to Buffalo, needing surgery with a projected 12-week recovery — expected ready before the 2026 opener.", source: "Wikipedia, ESPN" },
  { name: "Jayden Daniels", team: "WAS", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "Dislocated his left elbow in Week 9 2025, then re-aggravated it in Week 14, ending his season — 10 games missed total in 2025 across that and a knee/hamstring issue.", source: "Wikipedia" },
  { name: "J.J. McCarthy", team: "MIN", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "Tore the meniscus in his right knee in the 2024 preseason, missing his entire rookie year; also battled an ankle sprain, a concussion, and a hand fracture in 2025.", source: "Wikipedia" },
  { name: "Cam Ward", team: "TEN", pos: "QB", pattern: "single-major", confidence: "Medium-High",
    summary: "Grade 3 AC joint sprain (shoulder) in the 2025 season finale; no surgery needed, expected fully healthy for 2026.", source: "Wikipedia" },
  { name: "Michael Penix Jr.", team: "ATL", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "Partial ACL tear (Nov 2025) in the same knee he tore twice in college — reconstructive surgery, and as of Aug 2026 camp he's not yet cleared for full practice. Elevated risk given the repeat site.", source: "Wikipedia" },
  { name: "Will Levis", team: "TEN", pos: "QB", pattern: "single-major", confidence: "High",
    summary: "AC joint (shoulder) injury in Week 4 2024, played through it, re-aggravated it — required surgery in July 2025 that cost him the entire 2025 season.", source: "Wikipedia" },
  { name: "Deshaun Watson", team: "CLE", pos: "QB", pattern: "recurring", confidence: "High",
    summary: "Torn ACL (2017), fractured shoulder glenoid requiring surgery (2023), ruptured Achilles (Oct 2024), then re-ruptured the same Achilles in rehab requiring a second surgery that wiped out 2025. In an unresolved 2026 QB competition as of this writing.", source: "Wikipedia" },
  // Kicker research — Aug 2026. Deliberately excludes pure job-security /
  // performance-driven cuts (e.g. lost the job after a poor game) since
  // that's a roster risk, not an injury — the 🩹 flag stays specifically
  // about health so it doesn't get diluted into a general "risk" label.
  { name: "Cairo Santos", team: "CHI", pos: "K", pattern: "recurring", confidence: "High",
    summary: "Quad injury in Week 4 2024, then the same injury in Week 4 2025 (same week, same body part, both vs. the Raiders) — a genuine repeat pattern.", source: "Wikipedia" },
  { name: "Ka'imi Fairbairn", team: "HOU", pos: "K", pattern: "recurring", confidence: "Medium",
    summary: "Quad problems have recurred across his career — IR stints in 2016 and 2021, and a Week 9 2023 quad injury that cost roughly 5 games. Same body part flaring repeatedly.", source: "Wikipedia" },
  { name: "Matt Gay", team: "LV", pos: "K", pattern: "recurring", confidence: "Medium-High",
    summary: "Hip injury derailed his second half of 2023; hernia surgery just before Week 1 2024 plus a quad issue that year. Real injury pattern across hip/hernia/quad, on top of a separate performance-driven release from two prior teams.", source: "Wikipedia, web search" },
  { name: "Graham Gano", team: "FA", pos: "K", pattern: "recurring", confidence: "High",
    summary: "IR in 2023, then a groin injury (Sept 2025, IR) and a neck injury (Nov 2025, IR) in the same season. Released by the Giants with a failed-physical designation in March 2026 — currently unsigned, relevant if he lands somewhere for 2026.", source: "Wikipedia" },
  { name: "Tyler Bass", team: "BUF", pos: "K", pattern: "single-major", confidence: "High",
    summary: "Opened 2025 on IR with hip/groin issues, then had surgery on the same hip/groin in December 2025, ending his season. No prior injury history in 2023-2024.", source: "Wikipedia" },
  { name: "Jason Sanders", team: "FA", pos: "K", pattern: "single-major", confidence: "High",
    summary: "Placed on IR with a hip injury in Aug 2025 and missed the entire season; released by Miami in March 2026. Currently unsigned.", source: "Wikipedia" },
  { name: "Harrison Butker", team: "KC", pos: "K", pattern: "single-major", confidence: "Medium",
    summary: "Knee injury in practice (Nov 2024) cost roughly 4 weeks on IR. No recurrence found in 2023 or 2025 — appears resolved.", source: "Wikipedia" },
  { name: "Matt Prater", team: "BUF", pos: "K", pattern: "single-major", confidence: "Medium",
    summary: "Torn meniscus in his plant leg in 2024 (with Arizona), IR. Fully recovered and performed well in 2025; age (41+) plus a lower-leg surgical history is a mild ongoing risk factor.", source: "Wikipedia" },
];

// Player news pulled from NBC Sports' fantasy football news page
// (nbcsports.com/fantasy/football/player-news) on Aug 17, 2026 — 70 items
// spanning roughly Aug 15 evening through Aug 17. Summaries are written in
// our own words, not copied from the source article text. Seeded into your
// Research notes once, automatically, so it's there without pasting it in by
// hand — after that it behaves like any note you added yourself: editable
// away with Delete, and it won't come back once removed.
const NBC_NEWS_SEED = [
  { id: "nbc-20260817-2015-keenan-allen", players: ["Keenan Allen"], source: "NBC Sports", ts: 1787022900000,
    text: "Signed to a one-year, $8.32M contract with the Colts. Fantasy-relevant despite fitting a different role than Alec Pierce, whom he effectively replaces." },
  { id: "nbc-20260817-1815-jameson-williams", players: ["Jameson Williams"], source: "NBC Sports", ts: 1787015700000,
    text: "Dealing with a minor shoulder injury, missed two practices. HC Dan Campbell says he's \"good to go\" but he's unlikely to play in Saturday's preseason game." },
  { id: "nbc-20260817-1815-christian-mccaffrey", players: ["Christian McCaffrey"], source: "NBC Sports", ts: 1787015700000,
    text: "Camp tightness described as a legitimate injury, not a contract hold-in. Expected to be ready for the regular-season opener." },
  { id: "nbc-20260817-1615-jordyn-tyson", players: ["Jordyn Tyson"], source: "NBC Sports", ts: 1787008500000,
    text: "Expected to miss roughly two months with a hamstring injury \u2014 a recurring issue for him." },
  { id: "nbc-20260817-1515-kyle-monangai", players: ["Kyle Monangai"], source: "NBC Sports", ts: 1787004900000,
    text: "Will miss multiple weeks with a hyperextended right knee. Roschon Johnson now positioned as the backup behind D'Andre Swift." },
  { id: "nbc-20260817-1515-darren-waller", players: ["Darren Waller"], source: "NBC Sports", ts: 1787004900000,
    text: "Debut timeline still undetermined, but he says he feels significantly better than last season. Could be a matchup-based streaming option once healthy." },
  { id: "nbc-20260817-1415-jaylen-waddle", players: ["Jaylen Waddle"], source: "NBC Sports", ts: 1787001300000,
    text: "Returned to practice Monday after a muscle strain. HC Sean Payton called the progress positive. Profiles as a solid WR2 in Denver's offense." },
  { id: "nbc-20260817-1415-malik-nabers", players: ["Malik Nabers"], source: "NBC Sports", ts: 1787001300000,
    text: "Ran 11-on-11 drills for the first time since his ACL tear. Not yet full speed, but still on track for Week 1." },
  { id: "nbc-20260817-1415-trevor-lawrence", players: ["Trevor Lawrence"], source: "NBC Sports", ts: 1787001300000,
    text: "HC Liam Coen is trending toward playing starters in Friday's preseason game against the Panthers." },
  { id: "nbc-20260817-1315-puka-nacua", players: ["Puka Nacua"], source: "NBC Sports", ts: 1786997700000,
    text: "Still dealing with groin soreness; HC Sean McVay says the team is being cautious with the soft-tissue injury and hasn't given a firm return date." },
  { id: "nbc-20260817-1215-emeka-egbuka", players: ["Emeka Egbuka"], source: "NBC Sports", ts: 1786994100000,
    text: "HC Todd Bowles isn't sure he'll be ready for Week 1 with a sprained toe, a notably more cautious tone than earlier optimism. Profiles as a solid WR2 with Mike Evans now in San Francisco." },
  { id: "nbc-20260817-1215-rhamondre-stevenson", players: ["Rhamondre Stevenson"], source: "NBC Sports", ts: 1786994100000,
    text: "The Athletic projects a roughly 50-50 backfield split with TreVeyon Henderson, contingent on Henderson's pass-protection reps." },
  { id: "nbc-20260817-1215-marcus-davenport", players: ["Marcus Davenport"], source: "NBC Sports", ts: 1786994100000,
    text: "Signed by the Bears, reuniting with DC Dennis Allen. Projects as a situational pass rusher after an injury-shortened two years in Detroit." },
  { id: "nbc-20260817-1115-kyle-williams", players: ["Kyle Williams"], source: "NBC Sports", ts: 1786990500000,
    text: "The Athletic believes he'll carve out a role in New England's offense, though a crowded receiver room (A.J. Brown, Romeo Doubs) caps his fantasy relevance for now." },
  { id: "nbc-20260817-1115-jeremiyah-love", players: ["Jeremiyah Love"], source: "NBC Sports", ts: 1786990500000,
    text: "ESPN suggests he may be used more as a complementary back than a true every-down workhorse; also nursing a preseason ankle sprain." },
  { id: "nbc-20260817-1015-jake-moody", players: ["Jake Moody"], source: "NBC Sports", ts: 1786986900000,
    text: "Released by the Commanders after losing a kicking competition to undrafted rookie Drew Stevens." },
  { id: "nbc-20260817-1015-kc-concepcion", players: ["KC Concepcion"], source: "NBC Sports", ts: 1786986900000,
    text: "HC Todd Monken wants to get the rookie the ball in as many ways as possible; flashed early with a catch and a jet-sweep touchdown in the preseason opener." },
  { id: "nbc-20260817-1015-devonta-smith", players: ["DeVonta Smith"], source: "NBC Sports", ts: 1786986900000,
    text: "Hamstring injury has cost him over a week of practice; spotted on the sideline in shoulder pads Monday, an encouraging but not yet confirmed sign of a return." },
  { id: "nbc-20260817-1015-tony-pollard", players: ["Tony Pollard"], source: "NBC Sports", ts: 1786986900000,
    text: "Sat out Monday's practice with a foot issue; expected to remain Tennessee's lead back once healthy." },
  { id: "nbc-20260817-0915-najee-harris", players: ["Najee Harris"], source: "NBC Sports", ts: 1786983300000,
    text: "Free agent recovering from a torn Achilles is visiting the Giants; would likely work behind Cam Skattebo and Tyrone Tracy if signed." },
  { id: "nbc-20260817-0915-nate-wiggins", players: ["Nate Wiggins"], source: "NBC Sports", ts: 1786983300000,
    text: "Returned to practice Monday after missing the preseason opener; expected to be good to go moving forward." },
  { id: "nbc-20260817-0815-breece-hall", players: ["Breece Hall"], source: "NBC Sports", ts: 1786979700000,
    text: "HC Aaron Glenn said Hall's Monday practice injury doesn't look serious, but he'll be evaluated. Braelon Allen would step into lead-back duties if Hall misses time." },
  { id: "nbc-20260817-0715-mansoor-delane", players: ["Mansoor Delane"], source: "NBC Sports", ts: 1786976100000,
    text: "Practiced in full pads for the first time in camp, indicating his rookie-season shoulder injury is behind him and he's on track for Week 1." },
  { id: "nbc-20260817-0715-breece-hall", players: ["Breece Hall"], source: "NBC Sports", ts: 1786976100000,
    text: "Left Monday's practice with trainers after going down untouched on a catch; injury cause unclear pending further reports." },
  { id: "nbc-20260817-0715-chris-bell", players: ["Chris Bell"], source: "NBC Sports", ts: 1786976100000,
    text: "Activated from the NFI list as he continues recovering from a torn ACL; a rookie whose path to playing time is uncertain given Miami's receiver depth." },
  { id: "nbc-20260816-1906-alec-pierce", players: ["Alec Pierce"], source: "NBC Sports", ts: 1786932360000,
    text: "Not expected to resume practicing this week, which would wipe out the rest of the Colts' camp for him \u2014 a risky fantasy asset given the tight runway to Week 1." },
  { id: "nbc-20260816-1843-adoree-jackson", players: ["Adoree' Jackson"], source: "NBC Sports", ts: 1786930980000,
    text: "ESPN names him a free-agent option the Cowboys have explored, helped by a prior relationship with Dallas' new DC from their time together in Philadelphia." },
  { id: "nbc-20260816-1808-von-miller", players: ["Von Miller"], source: "NBC Sports", ts: 1786928880000,
    text: "Signed a one-year deal with the Cowboys after a productive 2025 (10 sacks, 36 pressures) with Washington; expected to contribute as a pass-rush specialist." },
  { id: "nbc-20260816-1745-anthony-richardson", players: ["Anthony Richardson"], source: "NBC Sports", ts: 1786927500000,
    text: "ESPN reports signs point toward the Colts keeping him on the roster in 2026 as a third quarterback rather than trading him." },
  { id: "nbc-20260816-1712-jeremiyah-love", players: ["Jeremiyah Love"], source: "NBC Sports", ts: 1786925520000,
    text: "Confirmed to be dealing with a high-ankle sprain; team remains hopeful he's ready for the Week 1 opener, with Tyler Allgeier worth a bench-stash look in the meantime." },
  { id: "nbc-20260816-1653-jaylin-noel", players: ["Jaylin Noel"], source: "NBC Sports", ts: 1786924380000,
    text: "Set to miss a few weeks with a hamstring re-injury on top of an existing finger issue; Jayden Higgins now has the inside track on the WR2 job." },
  { id: "nbc-20260816-1643-wan-dale-robinson", players: ["Wan'Dale Robinson"], source: "NBC Sports", ts: 1786923780000,
    text: "ESPN ties his signing to Tennessee's push to sharpen third-down and red-zone execution; saw more early-down snaps than Calvin Ridley in the preseason opener." },
  { id: "nbc-20260816-1621-jamal-adams", players: ["Jamal Adams"], source: "NBC Sports", ts: 1786922460000,
    text: "Suffered a season-ending knee injury in Saturday's preseason game, per Ian Rapoport \u2014 a tough break after signing a one-year deal this offseason." },
  { id: "nbc-20260816-1609-marcus-davenport", players: ["Marcus Davenport"], source: "NBC Sports", ts: 1786921740000,
    text: "Worked out for the Bears as a free agent shortly before signing with them; profiles as a rotational pass rusher after an injury-limited 2025." },
  { id: "nbc-20260816-1533-kyle-monangai", players: ["Kyle Monangai"], source: "NBC Sports", ts: 1786919580000,
    text: "Early tests came back clean per Adam Schefter, before a later hyperextended-knee diagnosis revised the outlook worse." },
  { id: "nbc-20260816-1531-noah-brown", players: ["Noah Brown"], source: "NBC Sports", ts: 1786919460000,
    text: "Signed by the Raiders after an injury-plagued 2025; likely a rotational depth piece behind a thin Las Vegas receiver room." },
  { id: "nbc-20260816-1521-rico-dowdle", players: ["Rico Dowdle"], source: "NBC Sports", ts: 1786918860000,
    text: "FOX Sports projects him as the Steelers' backfield workhorse in a run-heavy scheme, though Jaylen Warren could still carve out passing-down work." },
  { id: "nbc-20260816-1452-ozzy-trapilo", players: ["Ozzy Trapilo"], source: "NBC Sports", ts: 1786917120000,
    text: "Activated from PUP and already back at practice after last season's patellar tendon rupture \u2014 an encouraging recovery timeline for the Bears' left tackle competition." },
  { id: "nbc-20260816-1425-christian-mccaffrey", players: ["Christian McCaffrey"], source: "NBC Sports", ts: 1786915500000,
    text: "Did not practice Sunday with the same tightness issue; team isn't detailing specifics but there's no real concern about Week 1 readiness." },
  { id: "nbc-20260816-1408-kyle-monangai", players: ["Kyle Monangai"], source: "NBC Sports", ts: 1786914480000,
    text: "Left Sunday's practice early after getting tangled up with a defender; walked off under his own power, an early positive sign before the more serious diagnosis came later." },
  { id: "nbc-20260816-1352-george-kittle", players: ["George Kittle"], source: "NBC Sports", ts: 1786913520000,
    text: "Says he's nearing a return to practice from his Achilles injury and feels he has a chance to play Week 1 in Australia against the Rams." },
  { id: "nbc-20260816-1331-tucker-kraft", players: ["Tucker Kraft"], source: "NBC Sports", ts: 1786912260000,
    text: "Expects to play on a snap count for roughly the first half of the season as he eases back from a torn ACL, though he's on track for Week 1." },
  { id: "nbc-20260816-1314-jeremiyah-love", players: ["Jeremiyah Love"], source: "NBC Sports", ts: 1786911240000,
    text: "Team remains hopeful for a Week 1 return from his ankle injury; increasingly described as the presumptive lead back once healthy." },
  { id: "nbc-20260816-1256-deshaun-watson", players: ["Deshaun Watson"], source: "NBC Sports", ts: 1786910160000,
    text: "ESPN says a starter could be named soon after the second preseason game; recent reports suggest Watson has the edge over Shedeur Sanders." },
  { id: "nbc-20260816-1237-dominic-richardson", players: ["Dominic Richardson"], source: "NBC Sports", ts: 1786909020000,
    text: "Signed by the Titans as an undrafted free agent after being let go by the Cowboys." },
  { id: "nbc-20260816-1225-tank-dell", players: ["Tank Dell"], source: "NBC Sports", ts: 1786908300000,
    text: "Sat out Sunday's practice without an injury designation, likely a scheduled rest day as he continues working back from a 2024 multi-ligament knee injury." },
  { id: "nbc-20260816-1214-jaylin-noel", players: ["Jaylin Noel"], source: "NBC Sports", ts: 1786907640000,
    text: "Missed Sunday's practice with the hamstring/finger combo that would go on to sideline him for weeks." },
  { id: "nbc-20260816-1130-quinn-ewers", players: ["Quinn Ewers"], source: "NBC Sports", ts: 1786905000000,
    text: "Suffered a groin injury in Friday's preseason game; Miami signed Mark Gronowski for depth behind him as the primary backup." },
  { id: "nbc-20260816-1042-jeremy-mcnichols", players: ["Jeremy McNichols"], source: "NBC Sports", ts: 1786902120000,
    text: "Expected to be sidelined a few weeks with a quad injury \u2014 a tough spot given he was already no better than fourth on Washington's RB depth chart." },
  { id: "nbc-20260816-0955-isaiah-likely", players: ["Isaiah Likely"], source: "NBC Sports", ts: 1786899300000,
    text: "Leading all Giants first-team receivers in catches with Malik Nabers still working back from his ACL tear; ESPN argues he belongs closer to a top-10 tight end than his current ADP." },
  { id: "nbc-20260816-0946-malik-benson", players: ["Malik Benson"], source: "NBC Sports", ts: 1786898760000,
    text: "ESPN names him the Raiders' top training-camp performer and a threat to leapfrog Jack Bech for the third receiver job." },
  { id: "nbc-20260816-0922-lukas-van-ness", players: ["Lukas Van Ness"], source: "NBC Sports", ts: 1786897320000,
    text: "Sat out Sunday's practice with a shoulder issue of unknown severity \u2014 notable given Green Bay is already without Micah Parsons for the start of the season." },
  { id: "nbc-20260816-0918-parker-washington", players: ["Parker Washington"], source: "NBC Sports", ts: 1786897080000,
    text: "ESPN says he's established himself as Jacksonville's WR1 and Trevor Lawrence's favorite target, positioning him as a trustworthy WR2/3 despite a similar ADP to Brian Thomas Jr." },
  { id: "nbc-20260816-0822-antwaan-randle-el", players: ["Antwaan Randle El"], source: "NBC Sports", ts: 1786893720000,
    text: "Called plays for Chicago's offense in the second half of a strong preseason win \u2014 a coaching note more than a player update." },
  { id: "nbc-20260816-0806-marcus-mariota", players: ["Marcus Mariota"], source: "NBC Sports", ts: 1786892760000,
    text: "Sprained his MCL and will miss the rest of the preseason; expected to still be healthy enough to serve as Washington's backup for the regular season." },
  { id: "nbc-20260816-0745-cyrus-allen", players: ["Cyrus Allen"], source: "NBC Sports", ts: 1786891500000,
    text: "Led Kansas City in targets in the preseason opener working with the starters in the slot, though staying on the field deep into the game is a mild yellow flag for his path to early snaps." },
  { id: "nbc-20260816-0742-emmett-johnson", players: ["Emmett Johnson"], source: "NBC Sports", ts: 1786891320000,
    text: "HC Andy Reid highlighted his preseason-opener performance (12 carries, 59 yards); best speculative handcuff if Kenneth Walker were to get hurt, but not a must-roster piece otherwise." },
  { id: "nbc-20260816-0728-deshaun-watson", players: ["Deshaun Watson"], source: "NBC Sports", ts: 1786890480000,
    text: "HC Todd Monken praised his preseason-opener performance against the Bears, another data point suggesting Watson has the edge in Cleveland's QB competition." },
  { id: "nbc-20260816-0722-isaiah-williams", players: ["Isaiah Williams"], source: "NBC Sports", ts: 1786890120000,
    text: "The Athletic believes he's overtaken Omar Cooper for the Jets' starting slot job; a deep-sleeper add given his rookie-year return-game upside." },
  { id: "nbc-20260816-0718-cade-klubnik", players: ["Cade Klubnik"], source: "NBC Sports", ts: 1786889880000,
    text: "The Athletic sees him as the favorite for the Jets' backup quarterback job after a strong preseason-opener showing (5-of-7, 56 yards) with the starters." },
  { id: "nbc-20260816-0712-connor-mcgovern", players: ["Connor McGovern"], source: "NBC Sports", ts: 1786889520000,
    text: "Dealing with a multi-week, undisclosed injury; Lloyd Cushenberry would step in at center if he's not ready for Week 1." },
  { id: "nbc-20260816-0646-james-conner", players: ["James Conner"], source: "NBC Sports", ts: 1786887960000,
    text: "No clear timeline yet to return to full practice work; IR or PUP to open the season is reportedly on the table." },
  { id: "nbc-20260816-0641-chase-bisontis", players: ["Chase Bisontis"], source: "NBC Sports", ts: 1786887660000,
    text: "Placed on season-ending IR after tearing his MCL in the preseason opener." },
  { id: "nbc-20260816-0636-kyler-gordon", players: ["Kyler Gordon"], source: "NBC Sports", ts: 1786887360000,
    text: "Return timeline from a long-term calf injury is unknown; PUP or IR to start the season looks increasingly likely." },
  { id: "nbc-20260816-0623-malachi-fields", players: ["Malachi Fields"], source: "NBC Sports", ts: 1786886580000,
    text: "Caught a touchdown from Jaxson Dart in the preseason opener, strengthening his case for the No. 2 receiver job behind Malik Nabers." },
  { id: "nbc-20260816-0608-jonathon-brooks", players: ["Jonathon Brooks"], source: "NBC Sports", ts: 1786885680000,
    text: "Played his first game action in 20 months in Carolina's preseason opener, starting in place of a sidelined Chuba Hubbard \u2014 worth a deep-bench stash." },
  { id: "nbc-20260815-2006-camden-brown", players: ["Camden Brown"], source: "NBC Sports", ts: 1786849560000,
    text: "Caught two touchdowns, including a diving grab, in his preseason debut; far from a roster lock but one of camp's early standouts worth monitoring." },
  { id: "nbc-20260815-2000-jalen-milroe", players: ["Jalen Milroe"], source: "NBC Sports", ts: 1786849200000,
    text: "Split preseason-opener reps with Drew Lock and was outplayed by him; flashed rushing ability but struggled to push the ball downfield as a passer." },
  { id: "nbc-20260815-1903-ja-kobi-lane", players: ["Ja'Kobi Lane"], source: "NBC Sports", ts: 1786845780000,
    text: "Caught a touchdown in his preseason debut and looks like he's in line for a real shot at Baltimore's No. 3 receiver job." },
  { id: "nbc-20260815-1857-eli-stowers", players: ["Eli Stowers"], source: "NBC Sports", ts: 1786845420000,
    text: "Modest preseason debut (3 catches, 12 yards); talented rookie tight end who still has work to do before he's fantasy-relevant in 2026." },
];

// Scoring-format nudge for "Best Available" — Draft IQ has no real per-player
// projection or target-share data, so this is a deliberately modest,
// position-group-level heuristic (PPR rewards pass-catchers, Standard rewards
// volume rushers), not an accurate re-ranking. It never touches the player's
// displayed rank — only the internal recommendation score.
const FORMAT_LABEL = { STD: "Standard", HALF: "Half-PPR", PPR: "PPR" };
const FORMAT_POS_BONUS = {
  PPR: { WR: 12, TE: 10, RB: -4 },
  HALF: { WR: 6, TE: 5, RB: -2 },
  STD: { RB: 6, WR: -3, TE: -2 },
};

// 2026 NFL bye weeks, keyed by team abbreviation (Sleeper-style codes).
// Source: official NFL.com schedule release, cross-checked against SI.com (Aug 2026).
const BYE_WEEKS = {
  KC: 5, CAR: 5,
  CIN: 6, DET: 6, MIA: 6, MIN: 6,
  BUF: 7, JAX: 7, LAC: 7, WAS: 7,
  HOU: 8, NO: 8, NYG: 8, SF: 8,
  PIT: 9, TEN: 9,
  CHI: 10, DEN: 10, PHI: 10, TB: 10,
  ATL: 11, CLE: 11, GB: 11, LAR: 11, NE: 11, SEA: 11,
  BAL: 13, IND: 13, LV: 13, NYJ: 13,
  ARI: 14, DAL: 14,
};
// Common alternate abbreviations mapped to the keys above.
const TEAM_ALIASES = { WSH: "WAS", JAC: "JAX", LA: "LAR", OAK: "LV", SD: "LAC", STL: "LAR" };
const byeForTeam = (team) => {
  const t = (team || "").toUpperCase();
  return BYE_WEEKS[t] ?? BYE_WEEKS[TEAM_ALIASES[t]] ?? null;
};

const SAMPLE = `Christian McCaffrey,RB,SF,1
CeeDee Lamb,WR,DAL,2
Tyreek Hill,WR,MIA,3
Bijan Robinson,RB,ATL,4
Breece Hall,RB,NYJ,5
Ja'Marr Chase,WR,CIN,6
Justin Jefferson,WR,MIN,7
Amon-Ra St. Brown,WR,DET,8
Jahmyr Gibbs,RB,DET,9
Saquon Barkley,RB,PHI,10
A.J. Brown,WR,PHI,11
Garrett Wilson,WR,NYJ,12
Jonathan Taylor,RB,IND,13
Puka Nacua,WR,LAR,14
Travis Kelce,TE,KC,15
Patrick Mahomes,QB,KC,16
Josh Allen,QB,BUF,17
Sam LaPorta,TE,DET,18
Derrick Henry,RB,BAL,19
Mike Evans,WR,TB,20`;

export default function DraftRoom() {
  const [players, setPlayers] = useState([]);
  const [teamCount, setTeamCount] = useState(10);
  const [myPick, setMyPick] = useState(1);
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const [picks, setPicks] = useState([]); // {player, team, price?} — price only set in AUCTION mode
  const [draftMode, setDraftMode] = useState("SNAKE"); // SNAKE | AUCTION
  const [budget, setBudget] = useState(200); // auction-only: starting $ per team
  const [scoringFormat, setScoringFormat] = useState("PPR"); // STD | HALF | PPR
  const [pendingSale, setPendingSale] = useState(null); // auction-only: player selected, awaiting team+price
  const [saleTeam, setSaleTeam] = useState(1);
  const [salePrice, setSalePrice] = useState("");
  const [search, setSearch] = useState("");
  const [quickPick, setQuickPick] = useState("");
  const [qpIndex, setQpIndex] = useState(0);
  const [byeAlert, setByeAlert] = useState(null);
  const [reachAlert, setReachAlert] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [posFilter, setPosFilter] = useState("ALL");
  const [importText, setImportText] = useState("");
  const [started, setStarted] = useState(false);
  const [fetchState, setFetchState] = useState("idle"); // idle|loading|error
  const fileRef = useRef();

  // ── RESEARCH KNOWLEDGE BASE ──
  // Notes you paste in (articles, rankings, injury news) — tagged to a player
  // and persisted locally so they're still here next time you open the app.
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem("draftiq_notes");
      const saved = raw ? JSON.parse(raw) : [];
      // One-time seed of NBC Sports player news (see NBC_NEWS_SEED above) —
      // tracked separately from `notes` so a deleted seed entry stays deleted
      // instead of reappearing on the next load.
      const appliedRaw = localStorage.getItem("draftiq_news_seed_applied");
      const applied = new Set(appliedRaw ? JSON.parse(appliedRaw) : []);
      const toSeed = NBC_NEWS_SEED.filter((n) => !applied.has(n.id));
      if (toSeed.length) {
        try {
          localStorage.setItem("draftiq_news_seed_applied",
            JSON.stringify([...applied, ...toSeed.map((n) => n.id)]));
        } catch {}
        return [...toSeed, ...saved];
      }
      return saved;
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try { localStorage.setItem("draftiq_notes", JSON.stringify(notes)); } catch {}
  }, [notes]);
  const [showResearch, setShowResearch] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notePlayer, setNotePlayer] = useState(""); // manual extra tag, on top of auto-detected ones
  const [noteSource, setNoteSource] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  // Every note's players live in a `players` array now (a pasted roundup can
  // mention several guys at once). Older saved notes only had a single
  // `player` string — this normalizes either shape to an array everywhere below.
  const notePlayers = (n) => (n.players && n.players.length ? n.players : (n.player ? [n.player] : []));

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Last-name-only mentions ("McCaffrey exploded for 150 yards") only count
  // as a match when exactly one loaded player has that last name — avoids
  // mis-tagging when two players share a surname.
  const lastNameCounts = useMemo(() => {
    const counts = {};
    players.forEach((p) => {
      const parts = p.name.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      counts[last] = (counts[last] || 0) + 1;
    });
    return counts;
  }, [players]);
  const detectPlayers = (text) => {
    if (!text.trim() || !players.length) return [];
    const found = new Set();
    players.forEach((p) => {
      const name = p.name.trim();
      if (!name) return;
      const parts = name.split(/\s+/);
      const last = parts[parts.length - 1];
      if (new RegExp(`\\b${escapeRe(name)}\\b`, "i").test(text)) { found.add(name); return; }
      if (parts.length > 1 && lastNameCounts[last] === 1 && new RegExp(`\\b${escapeRe(last)}\\b`, "i").test(text)) {
        found.add(name);
      }
    });
    return [...found];
  };
  // Live preview of who a note-in-progress will get tagged to.
  const detectedPlayers = useMemo(() => detectPlayers(noteText), [noteText, players, lastNameCounts]);

  const addNote = () => {
    if (!noteText.trim()) return;
    const manual = notePlayer.trim() ? [notePlayer.trim()] : [];
    const taggedPlayers = [...new Set([...manual, ...detectPlayers(noteText)])];
    setNotes([{ id: Date.now(), players: taggedPlayers, source: noteSource.trim(),
      text: noteText.trim(), ts: Date.now() }, ...notes]);
    setNoteText("");
    setNoteSource("");
    setNotePlayer("");
  };
  const deleteNote = (id) => setNotes(notes.filter((n) => n.id !== id));
  const notesFor = (name) => {
    const target = (name || "").toLowerCase();
    return notes.filter((n) => notePlayers(n).some((p) => p.toLowerCase() === target));
  };
  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      notePlayers(n).some((p) => p.toLowerCase().includes(q)) ||
      (n.source || "").toLowerCase().includes(q) ||
      n.text.toLowerCase().includes(q));
  }, [notes, noteSearch]);
  const openNotesFor = (name) => { setNoteSearch(name); setShowResearch(true); };

  // ── INJURY-RISK FLAGS ──
  // Draft IQ has no real injury-history data (nothing free/reliable to pull
  // that's accurate season to season), so this is deliberately a one-click,
  // user-set flag rather than a fabricated "injury prone" label — you mark
  // who you're personally wary of, and get warned if you draft them anyway.
  const [injuryFlags, setInjuryFlags] = useState(() => {
    try {
      const raw = localStorage.getItem("draftiq_injury_flags");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try { localStorage.setItem("draftiq_injury_flags", JSON.stringify(injuryFlags)); } catch {}
  }, [injuryFlags]);
  const isInjuryFlagged = (name) => injuryFlags.some((n) => n.toLowerCase() === (name || "").toLowerCase());
  const toggleInjuryFlag = (name) => {
    setInjuryFlags((flags) => isInjuryFlagged(name)
      ? flags.filter((n) => n.toLowerCase() !== name.toLowerCase())
      : [...flags, name]);
  };
  const [injuryAlert, setInjuryAlert] = useState(null);
  const checkInjuryFlag = (player, team) => {
    if (team !== myPick) return;
    setInjuryAlert(isInjuryFlagged(player.name) ? { player: player.name } : null);
  };

  // Suggested flags from researched injury history — only offered for names
  // that actually match your loaded player pool, and only ones you haven't
  // already flagged yourself. Nothing here is applied until you review and confirm.
  const [showInjurySuggest, setShowInjurySuggest] = useState(false);
  const [suggestSelections, setSuggestSelections] = useState({});
  const suggestedInjuryFlags = useMemo(() => {
    if (!players.length) return [];
    const loaded = new Set(players.map((p) => p.name.toLowerCase()));
    return INJURY_RESEARCH.filter((r) => loaded.has(r.name.toLowerCase()) && !isInjuryFlagged(r.name));
  }, [players, injuryFlags]);
  const openInjurySuggestions = () => {
    const sel = {};
    suggestedInjuryFlags.forEach((r) => { sel[r.name] = true; });
    setSuggestSelections(sel);
    setShowInjurySuggest(true);
  };
  const applySuggestedFlags = () => {
    const toAdd = suggestedInjuryFlags.filter((r) => suggestSelections[r.name]).map((r) => r.name);
    setInjuryFlags((flags) => [...new Set([...flags, ...toAdd])]);
    setShowInjurySuggest(false);
  };

  // Flexible parser: auto-detects which column is name/pos/team/rank,
  // skips a header row if present, and normalizes position aliases.
  const normPos = (raw) => {
    let p = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (["DEF", "DST", "DEFENSE"].includes(p)) return "DST";
    // strip a trailing rank suffix like "QB1", "WR12" -> base position
    const base = p.replace(/[0-9]+$/, "");
    if (["QB", "RB", "WR", "TE"].includes(base)) return base;
    if (base === "K" || base === "PK") return "K";
    return POSITIONS.includes(base) ? base : "";
  };

  const parsePlayers = (text) => {
    let lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const splitRow = (l) => l.split(/\t|,/).map((s) => s.trim().replace(/^"|"$/g, ""));

    // Detect & skip header row (no valid position in any cell, has letters)
    const firstCells = splitRow(lines[0]);
    const headerLike = !firstCells.some((c) => normPos(c)) &&
      firstCells.some((c) => /name|player|pos|team|rank|tier/i.test(c));
    if (headerLike) lines = lines.slice(1);

    const rows = lines.map((line, i) => {
      const cells = splitRow(line);
      // Find the position cell, then name = first non-pos text cell, rank = first number
      let posIdx = cells.findIndex((c) => normPos(c));
      const pos = posIdx >= 0 ? normPos(cells[posIdx]) : "";
      const name = cells.find((c, idx) => idx !== posIdx && /[a-z]{2,}/i.test(c) && !normPos(c)) || cells[0];
      const nums = cells.map(Number).filter((n) => !isNaN(n) && n > 0);
      const rank = nums.length ? nums[0] : i + 1;
      // team = a 2-4 letter all-caps token that isn't the position
      const team = cells.find((c, idx) => idx !== posIdx && /^[A-Z]{2,4}$/.test(c)) || "";
      return { id: i, name, pos, team, rank, bye: byeForTeam(team) };
    }).filter((p) => p.name && p.pos);

    return rows.sort((a, b) => a.rank - b.rank).map((p, i) => ({ ...p, id: i }));
  };

  const loadImport = (text) => {
    const parsed = parsePlayers(text);
    if (parsed.length) { setPlayers(parsed); setPicks([]); }
    return parsed.length;
  };

  // Fetch the full player pool from Sleeper (free, no auth). Large file,
  // so we filter to fantasy-relevant positions and rank by search_rank.
  const fetchSleeper = async () => {
    setFetchState("loading");
    try {
      const res = await fetch("https://api.sleeper.app/v1/players/nfl");
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      const rows = Object.values(data)
        .filter((p) => p && POSITIONS.includes(p.position) && p.team &&
          (p.status === "Active" || p.position === "DST"))
        .map((p) => ({
          name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
          pos: p.position,
          team: p.team,
          rank: p.search_rank && p.search_rank < 9999 ? p.search_rank : 9999,
          bye: byeForTeam(p.team),
        }))
        .filter((p) => p.name)
        .sort((a, b) => a.rank - b.rank)
        .map((p, i) => ({ ...p, id: i, rank: i + 1 }));
      if (!rows.length) throw new Error("empty");
      setPlayers(rows);
      setPicks([]);
      setFetchState("idle");
    } catch (e) {
      setFetchState("error");
    }
  };

  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setImportText(r.result); loadImport(r.result); };
    r.readAsText(f);
  };

  const rosterSlotsTotal = Object.values(roster).reduce((a, b) => a + b, 0);
  const totalPicks = teamCount * rosterSlotsTotal;
  const currentOverall = picks.length + 1;
  const currentRound = Math.floor((currentOverall - 1) / teamCount) + 1;
  const snakeOnClockTeam = useMemo(() => {
    const idx = (currentOverall - 1) % teamCount;
    return currentRound % 2 === 1 ? idx + 1 : teamCount - idx;
  }, [currentOverall, teamCount, currentRound]);
  // Auction has no pick order to snake through — nominating just round-robins
  // by team number, one nomination per completed sale.
  const auctionOnClockTeam = useMemo(() => (picks.length % teamCount) + 1, [picks.length, teamCount]);
  const onClockTeam = draftMode === "AUCTION" ? auctionOnClockTeam : snakeOnClockTeam;
  const isMyTurn = onClockTeam === myPick;

  // Auction-only: budget bookkeeping, derived from picks' price field.
  const teamSpent = (team) => picks.filter((p) => p.team === team).reduce((sum, p) => sum + (p.price || 0), 0);
  const teamBudgetRemaining = (team) => budget - teamSpent(team);
  const mySlotsFilled = picks.filter((p) => p.team === myPick).length;
  const mySlotsRemaining = rosterSlotsTotal - mySlotsFilled;
  const myBudgetRemaining = teamBudgetRemaining(myPick);
  // Classic auction rule of thumb: reserve at least $1 for every other empty
  // slot so you don't spend yourself out of a full roster.
  const maxBid = Math.max(0, myBudgetRemaining - Math.max(0, mySlotsRemaining - 1));
  // Default the "winning team" field to whoever's up to nominate each time a
  // new sale starts — usually right, always editable if a different team won.
  useEffect(() => { if (pendingSale) setSaleTeam(auctionOnClockTeam); }, [pendingSale, auctionOnClockTeam]);

  const draftedIds = new Set(picks.map((p) => p.player.id));
  const available = players.filter((p) => !draftedIds.has(p.id));

  const filtered = available.filter((p) => {
    const matchPos = posFilter === "ALL" || p.pos === posFilter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchPos && matchSearch;
  });

  const tiers = useMemo(() => {
    const out = {};
    available.forEach((p) => { (out[p.pos] = out[p.pos] || []).push(p); });
    return out;
  }, [available]);

  const myRoster = picks.filter((p) => p.team === myPick);
  const byeCounts = {};
  myRoster.forEach((p) => { if (p.player.bye) byeCounts[p.player.bye] = (byeCounts[p.player.bye] || 0) + 1; });
  const filledByPos = {};
  myRoster.forEach((p) => { filledByPos[p.player.pos] = (filledByPos[p.player.pos] || 0) + 1; });

  const positionNeeds = useMemo(() => {
    const needs = [];
    ["QB", "RB", "WR", "TE", "K", "DST"].forEach((pos) => {
      const need = (roster[pos] || 0) - (filledByPos[pos] || 0);
      if (need > 0) needs.push({ pos, need });
    });
    return needs;
  }, [roster, picks, myPick]);

  const recommendation = useMemo(() => {
    if (!available.length) return null;
    const neededPos = new Set(positionNeeds.map((n) => n.pos));
    const posBonus = FORMAT_POS_BONUS[scoringFormat] || {};
    const scored = available.map((p) => {
      let score = 1000 - p.rank;
      if (neededPos.has(p.pos)) score += 50;
      if (["RB", "WR"].includes(p.pos) && neededPos.has(p.pos)) score += 20;
      score += posBonus[p.pos] || 0;
      return { ...p, score };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [available, positionNeeds, scoringFormat]);

  // ── DRAFT INTELLIGENCE LAYER ──

  // 1. TIER CLIFFS — group each position's available players into tiers by
  // gaps in their rank, then flag when a tier is nearly empty.
  const positionTiers = useMemo(() => {
    const out = {};
    POSITIONS.forEach((pos) => {
      const pool = available.filter((p) => p.pos === pos).sort((a, b) => a.rank - b.rank);
      if (!pool.length) return;
      // Break into tiers wherever the rank gap to the next player is large.
      const tierList = [];
      let cur = [pool[0]];
      for (let i = 1; i < pool.length; i++) {
        const gap = pool[i].rank - pool[i - 1].rank;
        // gap threshold scales a little so deep positions don't over-split
        if (gap >= 8 && cur.length >= 1) { tierList.push(cur); cur = [pool[i]]; }
        else cur.push(pool[i]);
      }
      tierList.push(cur);
      out[pos] = tierList;
    });
    return out;
  }, [available]);

  const tierCliffs = useMemo(() => {
    // A "cliff" = the current top tier at a position has 1-2 players left
    // AND there's a meaningful drop to the next tier.
    const cliffs = [];
    Object.entries(positionTiers).forEach(([pos, tl]) => {
      if (!tl.length || tl.length < 2) return;
      const top = tl[0];
      if (top.length <= 2) {
        const dropoff = tl[1][0].rank - top[top.length - 1].rank;
        if (dropoff >= 8) cliffs.push({ pos, left: top.length, names: top.map((p) => p.name) });
      }
    });
    return cliffs;
  }, [positionTiers]);

  // 2. POSITIONAL RUN — scan the last N picks; if one position dominates, it's a run.
  const positionalRun = useMemo(() => {
    const WINDOW = 8;
    const recent = picks.slice(-WINDOW);
    if (recent.length < 4) return null;
    const counts = {};
    recent.forEach((p) => { counts[p.player.pos] = (counts[p.player.pos] || 0) + 1; });
    let topPos = null, topCount = 0;
    Object.entries(counts).forEach(([pos, c]) => { if (c > topCount) { topPos = pos; topCount = c; } });
    if (topCount >= 3 && ["QB", "RB", "WR", "TE"].includes(topPos)) {
      const leftInTopTier = (positionTiers[topPos]?.[0] || []).length;
      return { pos: topPos, count: topCount, window: recent.length, leftInTopTier };
    }
    return null;
  }, [picks, positionTiers]);

  // 3. VALUE vs ADP — "rank" is expected draft position (ADP proxy). A player
  // still available well past their rank is a value; flag best available steals.
  const valuePicks = useMemo(() => {
    const here = currentOverall;
    return available
      .map((p) => ({ ...p, slip: here - p.rank })) // positive = falling past ADP
      .filter((p) => p.slip >= 8)
      .sort((a, b) => b.slip - a.slip)
      .slice(0, 3);
  }, [available, currentOverall]);

  // Is the player the user is about to take a reach? (drafted well before ADP)
  const reachThreshold = Math.max(8, Math.round(teamCount * 1.2));

  // Bye-week clash check — only for your own roster. Shared by snake drafting
  // and auction sale-logging, since both eventually just add to `picks`.
  const checkByeClash = (player, team) => {
    if (team !== myPick || !player.bye) return;
    const sameBye = picks.filter((p) => p.team === myPick && p.player.bye === player.bye);
    if (sameBye.length > 0) {
      setByeAlert({
        week: player.bye,
        player: player.name,
        others: sameBye.map((p) => `${p.player.name} (${p.player.pos})`),
      });
    } else {
      setByeAlert(null);
    }
  };

  const draft = (player) => {
    if (picks.length >= totalPicks) return;
    checkByeClash(player, onClockTeam);
    checkInjuryFlag(player, onClockTeam);
    // Reach check — only for your own picks. Taking someone well before ADP.
    // Snake-only: "reach" means pick timing, which auction doesn't have.
    if (onClockTeam === myPick && player.rank - currentOverall >= reachThreshold) {
      setReachAlert({ player: player.name, rank: player.rank, pick: currentOverall,
        spots: player.rank - currentOverall });
    } else if (onClockTeam === myPick) {
      setReachAlert(null);
    }
    setPicks([...picks, { player, team: onClockTeam }]);
  };

  // Auction mode: selecting a player doesn't immediately assign them — it
  // stages a pending sale so you can enter who won and for how much.
  const pickOrNominate = (player) => {
    if (draftMode === "AUCTION") setPendingSale(player);
    else draft(player);
  };
  const logSale = () => {
    if (!pendingSale || salePrice === "" || Number(salePrice) < 0 || picks.length >= totalPicks) return;
    const price = Math.round(Number(salePrice));
    checkByeClash(pendingSale, saleTeam);
    checkInjuryFlag(pendingSale, saleTeam);
    setPicks([...picks, { player: pendingSale, team: saleTeam, price }]);
    setPendingSale(null);
    setSalePrice("");
  };
  const cancelSale = () => { setPendingSale(null); setSalePrice(""); };

  const undo = () => { setPicks(picks.slice(0, -1)); setByeAlert(null); setReachAlert(null); setInjuryAlert(null); };

  // Quick-pick: fuzzy match the typed text against available players.
  // Matches on full name plus a "first-initial lastname" shorthand (e.g. "j chase").
  const qpMatches = useMemo(() => {
    const q = quickPick.trim().toLowerCase();
    if (!q) return [];
    return available
      .filter((p) => {
        const n = p.name.toLowerCase();
        if (n.includes(q)) return true;
        const parts = p.name.toLowerCase().split(/\s+/);
        const initialForm = parts.length > 1 ? parts[0][0] + " " + parts.slice(1).join(" ") : "";
        return initialForm.startsWith(q) || parts.some((part) => part.startsWith(q));
      })
      .slice(0, 6);
  }, [quickPick, available]);

  const confirmQuickPick = (player) => {
    const target = player || qpMatches[qpIndex];
    if (!target) return;
    pickOrNominate(target);
    setQuickPick("");
    setQpIndex(0);
  };

  const onQuickKey = (e) => {
    if (!qpMatches.length) return;
    if (e.key === "Enter") { e.preventDefault(); confirmQuickPick(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setQpIndex((i) => Math.min(i + 1, qpMatches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setQpIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { setQuickPick(""); setQpIndex(0); }
  };

  const C = {
    bg: "#0a0e14", panel: "#121823", line: "#1f2937",
    txt: "#e8edf4", dim: "#8a96a8", accent: "#39ff88", gold: "#ffd23f", accentRed: "#e63946",
  };
  const font = "'DM Sans', system-ui, sans-serif";
  const headFont = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif";

  // Floating entry point + modal for the research knowledge base — defined once,
  // rendered from both the setup screen and the draft screen below.
  const researchButton = (
    <button onClick={() => setShowResearch(true)} style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 40,
      background: C.panel, color: C.gold, border: `2px solid ${C.gold}`, borderRadius: 30,
      padding: "12px 20px", fontWeight: 700, fontSize: 14, fontFamily: font,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      📚 Research{notes.length > 0 ? ` (${notes.length})` : ""}
    </button>
  );

  const researchPanel = showResearch && (
    <div onClick={() => setShowResearch(false)} style={{
      position: "fixed", inset: 0, background: "rgba(5,8,12,0.7)", backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)", zIndex: 50, animation: "fadeIn .15s ease",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="diq-card" style={{
        background: "linear-gradient(180deg, #10161f 0%, #0a0e14 100%)", border: `1px solid ${C.line}`,
        borderRadius: 16, width: "100%", maxWidth: 640, animation: "slideUp .2s ease",
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: font,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: headFont, fontSize: 22, letterSpacing: 1, color: C.gold }}>
            📚 RESEARCH NOTES
          </div>
          <button onClick={() => setShowResearch(false)}
            style={{ background: "transparent", border: "none", color: C.dim, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 16, borderBottom: `1px solid ${C.line}` }}>
          <p style={{ color: C.dim, fontSize: 12, margin: "0 0 10px" }}>
            Paste in article excerpts, expert rankings, injury updates, or your own scouting notes. Any player
            names it recognizes from your loaded list get tagged automatically — no need to type them yourself.
          </p>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
            placeholder="Paste a note, article excerpt, injury update, ranking blurb…"
            style={{ width: "100%", minHeight: 70, background: C.panel, color: C.txt, border: `1px solid ${C.line}`,
              borderRadius: 8, padding: 10, fontSize: 13, fontFamily: font, resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ minHeight: 18, marginTop: 6, fontSize: 12, color: C.dim }}>
            {detectedPlayers.length > 0 ? (
              <>🏷 Auto-tagging: {detectedPlayers.map((n, i) => (
                <span key={n} style={{ color: C.gold, fontWeight: 700 }}>{n}{i < detectedPlayers.length - 1 ? ", " : ""}</span>
              ))}</>
            ) : noteText.trim() ? "No player names recognized — you can still tag one manually below." : ""}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <input value={notePlayer} onChange={(e) => setNotePlayer(e.target.value)} list="playerNames"
              placeholder="+ Tag another player manually (optional)" style={{ ...numInput(C), width: "auto", flex: "1 1 200px" }} />
            <input value={noteSource} onChange={(e) => setNoteSource(e.target.value)}
              placeholder="Source (optional)" style={{ ...numInput(C), width: "auto", flex: "1 1 140px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={addNote} disabled={!noteText.trim()}
              style={{ ...btn(C.accent, C.bg), opacity: noteText.trim() ? 1 : 0.4,
                cursor: noteText.trim() ? "pointer" : "not-allowed" }}>+ Add Note</button>
          </div>
        </div>

        <div style={{ padding: "10px 16px" }}>
          <input value={noteSearch} onChange={(e) => setNoteSearch(e.target.value)}
            placeholder="Search notes by player, source, or text…"
            style={{ width: "100%", background: C.panel, color: C.txt, border: `1px solid ${C.line}`,
              borderRadius: 8, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
        </div>

        <div style={{ padding: "0 16px 16px", overflowY: "auto", flex: 1 }}>
          {filteredNotes.length === 0 && (
            <p style={{ color: C.dim, fontSize: 13 }}>
              {notes.length === 0
                ? "No notes yet — add your first one above."
                : "No notes match your search."}
            </p>
          )}
          {filteredNotes.map((n) => (
            <div key={n.id} className="diq-row" style={{ background: C.panel, borderRadius: 8, padding: 12, marginBottom: 8,
              borderLeft: `3px solid ${C.gold}`, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontSize: 12, color: C.dim }}>
                  {notePlayers(n).length > 0 && (
                    <strong style={{ color: C.gold }}>{notePlayers(n).join(", ")}</strong>
                  )}
                  {notePlayers(n).length > 0 && n.source && " · "}
                  {n.source}
                  {(notePlayers(n).length > 0 || n.source) && " · "}
                  {new Date(n.ts).toLocaleDateString()}
                </div>
                <button onClick={() => deleteNote(n.id)}
                  style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 12 }}>
                  Delete
                </button>
              </div>
              <div style={{ fontSize: 13, color: C.txt, marginTop: 6, whiteSpace: "pre-wrap" }}>{n.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const injurySuggestPanel = showInjurySuggest && (
    <div onClick={() => setShowInjurySuggest(false)} style={{
      position: "fixed", inset: 0, background: "rgba(5,8,12,0.7)", backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)", zIndex: 50, animation: "fadeIn .15s ease",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="diq-card" style={{
        background: "linear-gradient(180deg, #10161f 0%, #0a0e14 100%)", border: "1px solid #ff8c42",
        borderRadius: 16, width: "100%", maxWidth: 680, animation: "slideUp .2s ease",
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: font,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: headFont, fontSize: 22, letterSpacing: 1, color: "#ff8c42" }}>
            🩹 SUGGESTED INJURY FLAGS
          </div>
          <button onClick={() => setShowInjurySuggest(false)}
            style={{ background: "transparent", border: "none", color: C.dim, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.line}` }}>
          <p style={{ color: C.dim, fontSize: 12, margin: 0 }}>
            Researched from public sources (ESPN, Pro Football Reference, FantasyPros, team reporting) — not official
            stats, and nothing here is applied until you confirm. Uncheck anything you disagree with. "Single-major"
            means one severe injury with a long recovery, not a recurring pattern.
          </p>
        </div>

        <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>
          {suggestedInjuryFlags.length === 0 && (
            <p style={{ color: C.dim, fontSize: 13 }}>No new suggestions for your loaded players.</p>
          )}
          {suggestedInjuryFlags.map((r) => (
            <label key={r.name} style={{ display: "flex", gap: 10, alignItems: "flex-start",
              background: C.panel, borderRadius: 8, padding: 12, marginBottom: 8, cursor: "pointer",
              borderLeft: `3px solid ${r.pattern === "recurring" ? "#ff8c42" : C.gold}` }}>
              <input type="checkbox" checked={!!suggestSelections[r.name]}
                onChange={(e) => setSuggestSelections({ ...suggestSelections, [r.name]: e.target.checked })}
                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: "#ff8c42" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {r.name} <span style={{ color: C.dim, fontWeight: 400, fontSize: 12 }}>· {r.pos} · {r.team}</span>
                  </div>
                  <div style={{ fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ background: r.pattern === "recurring" ? "rgba(255,140,66,0.15)" : "rgba(255,210,63,0.12)",
                      color: r.pattern === "recurring" ? "#ff8c42" : C.gold, borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>
                      {r.pattern === "recurring" ? "RECURRING" : "SINGLE-MAJOR"}
                    </span>
                    <span style={{ color: C.dim }}>{r.confidence} confidence</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.txt, marginTop: 4 }}>{r.summary}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Source: {r.source}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderTop: `1px solid ${C.line}`, gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => {
              const all = {}; suggestedInjuryFlags.forEach((r) => { all[r.name] = true; }); setSuggestSelections(all);
            }} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.dim, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
              Select all
            </button>
            <button onClick={() => setSuggestSelections({})}
              style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.dim, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
              Select none
            </button>
          </div>
          <button onClick={applySuggestedFlags} disabled={suggestedInjuryFlags.length === 0}
            style={{ ...btn("#ff8c42", C.bg), opacity: suggestedInjuryFlags.length === 0 ? 0.4 : 1 }}>
            Apply {Object.values(suggestSelections).filter(Boolean).length} selected flag{Object.values(suggestSelections).filter(Boolean).length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );

  const playerNameOptions = (
    <datalist id="playerNames">
      {players.map((p) => <option key={p.id} value={p.name} />)}
    </datalist>
  );

  // ----- SETUP SCREEN -----
  if (!started) {
    return (
      <>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.txt, fontFamily: font, padding: "32px 20px" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ fontFamily: headFont, fontSize: 64, letterSpacing: 2, margin: 0, lineHeight: 1,
            backgroundImage: `linear-gradient(135deg, ${C.accent} 0%, #2dd4bf 65%, ${C.accent} 100%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 16px rgba(57,255,136,0.25))", display: "inline-block" }}>
            DRAFT IQ
          </h1>
          <p style={{ color: C.dim, marginTop: 4, marginBottom: 28, letterSpacing: 1 }}>SNAKE DRAFT INTELLIGENCE</p>

          <div className="diq-card" style={{ background: "linear-gradient(180deg, #141b28 0%, #10161f 100%)",
            border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <Label C={C}>1 · Get your player list</Label>
            <p style={{ color: C.dim, fontSize: 13, margin: "0 0 12px" }}>
              Fetch live from Sleeper, or paste/upload any list. Columns are auto-detected — order doesn't matter,
              and a header row is fine. It just needs a <strong style={{ color: C.txt }}>name</strong> and a{" "}
              <strong style={{ color: C.txt }}>position</strong> (QB/RB/WR/TE/K/DST or DEF) per row; team and rank optional.
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <button onClick={fetchSleeper} disabled={fetchState === "loading"}
                style={{ ...btn(C.gold, C.bg), opacity: fetchState === "loading" ? 0.6 : 1 }}>
                {fetchState === "loading" ? "Fetching…" : "⬇ Fetch from Sleeper (free)"}
              </button>
            </div>
            {fetchState === "error" && (
              <div style={{ background: "rgba(230,57,70,0.12)", border: `1px solid ${C.accentRed || "#e63946"}`,
                borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: C.txt }}>
                Couldn't reach Sleeper from here (the browser likely blocked the request). No problem — open{" "}
                <a href="https://api.sleeper.app/v1/players/nfl" target="_blank" rel="noreferrer"
                  style={{ color: C.gold }}>this link</a>, copy the JSON, or paste any ranking list below. The box accepts
                CSV, tab-separated, or pasted spreadsheet rows.
              </div>
            )}
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste any list — CSV, tab-separated, or spreadsheet rows:&#10;Christian McCaffrey, RB, SF, 1&#10;1  Bijan Robinson  RB  ATL&#10;CeeDee Lamb (WR - DAL)..."
              style={{ width: "100%", minHeight: 140, background: C.bg, color: C.txt, border: `1px solid ${C.line}`,
                borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => loadImport(importText)} style={btn(C.accent, C.bg)}>Load List</button>
              <button onClick={() => fileRef.current.click()} style={btn("transparent", C.txt, C.line)}>Upload CSV</button>
              <button onClick={() => { setImportText(SAMPLE); loadImport(SAMPLE); }} style={btn("transparent", C.dim, C.line)}>Use Sample</button>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFile} style={{ display: "none" }} />
            </div>
            {players.length > 0 && (
              <p style={{ color: C.accent, fontSize: 13, marginTop: 12, marginBottom: 0 }}>✓ {players.length} players loaded</p>
            )}
            {suggestedInjuryFlags.length > 0 && (
              <button onClick={openInjurySuggestions} style={{
                ...btn("transparent", "#ff8c42", "#ff8c42"), marginTop: 12, display: "block",
              }}>
                🩹 Review {suggestedInjuryFlags.length} suggested injury flag{suggestedInjuryFlags.length === 1 ? "" : "s"}
              </button>
            )}
          </div>

          <div className="diq-card" style={{ background: "linear-gradient(180deg, #141b28 0%, #10161f 100%)",
            border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <Label C={C}>2 · League settings</Label>

            <Label C={C} small style={{ marginBottom: 6 }}>Draft type</Label>
            <SegGroup C={C} value={draftMode} onChange={setDraftMode}
              options={[{ value: "SNAKE", label: "Snake" }, { value: "AUCTION", label: "Auction" }]} />
            <p style={{ color: C.dim, fontSize: 12, margin: "6px 0 0" }}>
              {draftMode === "AUCTION"
                ? "Log winning bids as they happen — Draft IQ tracks every team's remaining budget for you."
                : "Standard pick-order draft — the board follows snake order automatically."}
            </p>

            <Label C={C} style={{ marginTop: 18, marginBottom: 6 }}>Scoring format</Label>
            <SegGroup C={C} value={scoringFormat} onChange={setScoringFormat}
              options={[{ value: "STD", label: "Standard" }, { value: "HALF", label: "Half-PPR" }, { value: "PPR", label: "PPR" }]} />
            <p style={{ color: C.dim, fontSize: 12, margin: "6px 0 0" }}>
              Draft IQ doesn't have real per-player projections, so this only gives "Best Available" a modest,
              clearly-labeled nudge — toward pass-catchers in PPR, toward volume rushers in Standard. It never
              changes the rank shown on a player.
            </p>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 18 }}>
              <Field label="Teams" C={C}>
                <input type="number" min={4} max={16} value={teamCount}
                  onChange={(e) => setTeamCount(Math.max(4, Math.min(16, +e.target.value || 4)))}
                  style={numInput(C)} />
              </Field>
              <Field label={draftMode === "AUCTION" ? "Your team #" : "Your draft slot"} C={C}>
                <input type="number" min={1} max={teamCount} value={myPick}
                  onChange={(e) => setMyPick(Math.max(1, Math.min(teamCount, +e.target.value || 1)))}
                  style={numInput(C)} />
              </Field>
              {draftMode === "AUCTION" && (
                <Field label="Starting budget ($)" C={C}>
                  <input type="number" min={1} max={2000} value={budget}
                    onChange={(e) => setBudget(Math.max(1, +e.target.value || 1))}
                    style={numInput(C)} />
                </Field>
              )}
            </div>
            <Label C={C} style={{ marginTop: 20 }}>Roster spots</Label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
              {Object.keys(roster).map((k) => (
                <Field key={k} label={k} C={C} small>
                  <input type="number" min={0} max={9} value={roster[k]}
                    onChange={(e) => setRoster({ ...roster, [k]: Math.max(0, +e.target.value || 0) })}
                    style={{ ...numInput(C), width: 52 }} />
                </Field>
              ))}
            </div>
          </div>

          {/* How to use — collapsible */}
          <div className="diq-card" style={{ background: "linear-gradient(180deg, #141b28 0%, #10161f 100%)",
            border: `1px solid ${C.line}`, borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
            <button onClick={() => setShowHelp(!showHelp)} style={{ width: "100%", background: "transparent",
              border: "none", color: C.txt, padding: "18px 24px", display: "flex", justifyContent: "space-between",
              alignItems: "center", fontFamily: headFont, fontSize: 18, letterSpacing: 1 }}>
              <span>❓ HOW TO USE DRAFT IQ</span>
              <span style={{ color: C.dim, fontSize: 22, transition: "transform .2s ease",
                transform: showHelp ? "rotate(180deg)" : "none", display: "inline-block" }}>{showHelp ? "−" : "+"}</span>
            </button>
            {showHelp && (
              <div style={{ padding: "0 24px 22px", fontSize: 14, color: C.dim, lineHeight: 1.6, animation: "fadeIn .2s ease" }}>
                <HelpStep C={C} n="1" title="Load your players">
                  Fetch a free pool from Sleeper, paste your own rankings, or upload a CSV. Each row just needs a name
                  and a position — team, rank, and bye week fill in automatically.
                </HelpStep>
                <HelpStep C={C} n="2" title="Set your league">
                  Enter the number of teams, your draft slot, and adjust roster spots to match your league. Choose
                  Snake or Auction draft type, and Standard/Half-PPR/PPR scoring — PPR gently favors pass-catchers
                  in your recommendations, Standard favors volume rushers.
                </HelpStep>
                <HelpStep C={C} n="3" title="Log every pick as it happens">
                  This is the key habit. As each player is drafted — in your Yahoo/ESPN draft or in the room — mark them
                  taken. Fastest way: the ⚡ quick-pick bar — type a few letters (e.g. “chase” or “j chase”) and hit Enter.
                  In Snake mode the board follows pick order automatically. In Auction mode, selecting a player opens a
                  small form to enter the winning team and price — Draft IQ tracks every team's remaining budget for you.
                </HelpStep>
                <HelpStep C={C} n="4" title="Read the intel">
                  The header glows green on your turn. 💎 marks values falling past ADP. Colored strips warn of positional
                  runs and tier cliffs. Your own picks trigger bye-week and reach alerts. Roster needs update live on the right.
                  Tap 🩹 on any player to flag them as injury-prone yourself — Draft IQ has no real injury data, so this
                  is your call, not a fetched stat; you'll get a warning if you draft someone you flagged.
                </HelpStep>
                <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,210,63,0.08)",
                  border: `1px solid ${C.gold}`, borderRadius: 8, color: C.txt }}>
                  💡 Draft IQ doesn't auto-sync with Yahoo — keep it open on a second screen and mirror each pick.
                  Its accuracy comes from you logging picks. Hit Undo anytime to reverse the last one.
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => players.length && setStarted(true)}
            disabled={!players.length}
            style={{ ...btn(C.accent, C.bg), width: "100%", padding: 16, fontSize: 18, fontWeight: 700,
              opacity: players.length ? 1 : 0.4,
              boxShadow: players.length ? `0 6px 22px ${BTN_GLOW[C.accent]}` : "none" }}
          >
            START DRAFT →
          </button>
        </div>
      </div>
      {researchButton}
      {researchPanel}
      {injurySuggestPanel}
      {playerNameOptions}
      </>
    );
  }

  // ----- DRAFT SCREEN -----
  return (
    <>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.txt, fontFamily: font }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header / on the clock */}
      <div className={isMyTurn ? "diq-pulse" : ""} style={{
        background: isMyTurn ? `linear-gradient(135deg, ${C.accent} 0%, #2dd4bf 100%)` : C.panel,
        borderBottom: `1px solid ${C.line}`,
        padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12, transition: "background .3s" }}>
        <div>
          <div style={{ fontFamily: headFont, fontSize: 28, letterSpacing: 1, color: isMyTurn ? C.bg : C.accent, lineHeight: 1 }}>
            {picks.length >= totalPicks ? "DRAFT COMPLETE"
              : draftMode === "AUCTION" ? `SALE ${currentOverall} OF ${totalPicks}`
              : `ROUND ${currentRound} · PICK ${currentOverall}`}
          </div>
          <div style={{ fontSize: 14, color: isMyTurn ? C.bg : C.dim, fontWeight: 700 }}>
            {picks.length >= totalPicks ? "All roster slots filled"
              : isMyTurn ? (draftMode === "AUCTION" ? "🎯 YOU'RE UP TO NOMINATE" : "🎯 YOU'RE ON THE CLOCK")
              : draftMode === "AUCTION" ? `Team ${onClockTeam} nominates next` : `Team ${onClockTeam} on the clock`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontFamily: headFont, fontSize: 20, letterSpacing: 1,
            color: isMyTurn ? C.bg : C.dim, marginRight: 4 }}>DRAFT IQ</span>
          <button onClick={undo} disabled={!picks.length} style={{ ...btn("transparent", isMyTurn ? C.bg : C.txt, isMyTurn ? C.bg : C.line), opacity: picks.length ? 1 : 0.4 }}>↶ Undo</button>
          {suggestedInjuryFlags.length > 0 && (
            <button onClick={openInjurySuggestions} style={btn("transparent", "#ff8c42", "#ff8c42")}>
              🩹 {suggestedInjuryFlags.length}
            </button>
          )}
          <button onClick={() => setStarted(false)} style={btn("transparent", isMyTurn ? C.bg : C.dim, isMyTurn ? C.bg : C.line)}>Settings</button>
        </div>
      </div>

      {/* Bye-week clash alert */}
      {byeAlert && (
        <div style={{ background: "#3a1d1f", borderBottom: `2px solid ${C.accentRed}`,
          padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          animation: "fadeIn .2s ease", boxShadow: "0 4px 16px rgba(230,57,70,0.15)" }}>
          <div style={{ fontSize: 14, color: C.txt }}>
            <strong style={{ color: C.accentRed }}>⚠ Bye-week clash —</strong>{" "}
            <strong>{byeAlert.player}</strong> is on a <strong>Week {byeAlert.week}</strong> bye, same as{" "}
            {byeAlert.others.join(", ")} on your roster. You'll be short at those spots that week.
          </div>
          <button onClick={() => setByeAlert(null)}
            style={{ ...btn("transparent", C.txt, C.accentRed), padding: "6px 14px", flexShrink: 0 }}>
            Got it
          </button>
        </div>
      )}

      {/* Reach alert */}
      {reachAlert && (
        <div style={{ background: "#3a2f17", borderBottom: `2px solid ${C.gold}`,
          padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          animation: "fadeIn .2s ease", boxShadow: "0 4px 16px rgba(255,210,63,0.15)" }}>
          <div style={{ fontSize: 14, color: C.txt }}>
            <strong style={{ color: C.gold }}>↗ Reach —</strong>{" "}
            you took <strong>{reachAlert.player}</strong> at pick {reachAlert.pick}, but they ranked #{reachAlert.rank}
            {" "}(~{reachAlert.spots} spots early). Might've been there on your next turn.
          </div>
          <button onClick={() => setReachAlert(null)}
            style={{ ...btn("transparent", C.txt, C.gold), padding: "6px 14px", flexShrink: 0 }}>
            Got it
          </button>
        </div>
      )}

      {/* Injury-risk alert — fires only for a player you personally flagged */}
      {injuryAlert && (
        <div style={{ background: "#2a1a10", borderBottom: "2px solid #ff8c42",
          padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          animation: "fadeIn .2s ease", boxShadow: "0 4px 16px rgba(255,140,66,0.15)" }}>
          <div style={{ fontSize: 14, color: C.txt }}>
            <strong style={{ color: "#ff8c42" }}>🩹 Injury risk —</strong>{" "}
            you just added <strong>{injuryAlert.player}</strong>, a player you flagged as injury-prone.
            Might be worth prioritizing depth or a handcuff at that spot.
          </div>
          <button onClick={() => setInjuryAlert(null)}
            style={{ ...btn("transparent", C.txt, "#ff8c42"), padding: "6px 14px", flexShrink: 0 }}>
            Got it
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, alignItems: "start" }}>
        {/* LEFT: available players */}
        <div style={{ padding: 20, borderRight: `1px solid ${C.line}` }}>
          {/* Quick-pick bar — fastest way to mirror a Yahoo/live draft */}
          {picks.length < totalPicks && (
            <div className="diq-quickpick" style={{ position: "relative", marginBottom: 18, borderRadius: 10,
              transition: "box-shadow .2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.panel,
                border: `2px solid ${C.gold}`, borderRadius: 10, padding: "4px 4px 4px 14px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <input
                  value={quickPick}
                  onChange={(e) => { setQuickPick(e.target.value); setQpIndex(0); }}
                  onKeyDown={onQuickKey}
                  autoFocus
                  placeholder={draftMode === "AUCTION"
                    ? "Log a sale — type a player's name…"
                    : "Quick-pick — type a name, press Enter to mark drafted…"}
                  style={{ flex: 1, background: "transparent", color: C.txt, border: "none", outline: "none",
                    boxShadow: "none", padding: "10px 0", fontSize: 15, fontWeight: 500 }}
                />
                {quickPick && (
                  <button onClick={() => confirmQuickPick()} disabled={!qpMatches.length}
                    style={{ ...btn(C.gold, C.bg), padding: "8px 16px", opacity: qpMatches.length ? 1 : 0.4 }}>
                    {draftMode === "AUCTION" ? "Select ↵" : "Draft ↵"}
                  </button>
                )}
              </div>
              {quickPick && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
                  background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
                  {qpMatches.length === 0 && (
                    <div style={{ padding: "12px 14px", color: C.dim, fontSize: 13 }}>No available player matches “{quickPick}”.</div>
                  )}
                  {qpMatches.map((p, i) => (
                    <div key={p.id}
                      onMouseEnter={() => setQpIndex(i)}
                      onClick={() => confirmQuickPick(p)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", cursor: "pointer", background: i === qpIndex ? "rgba(255,210,63,0.14)" : "transparent",
                        borderLeft: `3px solid ${POS_COLORS[p.pos]}`, transition: "background-color .1s ease" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {p.name}{isInjuryFlagged(p.name) && <span style={{ color: "#ff8c42" }}> 🩹</span>}
                      </span>
                      <span style={{ fontSize: 12, color: C.dim }}>
                        <span style={{ color: POS_COLORS[p.pos], fontWeight: 700 }}>{p.pos}</span> · {p.team} · #{p.rank}
                      </span>
                    </div>
                  ))}
                  <div style={{ padding: "7px 14px", fontSize: 11, color: C.dim, borderTop: `1px solid ${C.line}` }}>
                    {draftMode === "AUCTION"
                      ? "↑↓ to choose · Enter to select · you'll enter the winning team and price next"
                      : "↑↓ to choose · Enter to draft · this marks the player gone for whoever is on the clock"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auction: pending sale — enter who won and for how much */}
          {draftMode === "AUCTION" && pendingSale && (
            <div className="diq-card" style={{ background: "linear-gradient(180deg, #171d14 0%, #121823 60%)",
              border: `1px solid ${C.gold}`, borderRadius: 12, padding: 16, marginBottom: 18, animation: "slideUp .15s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {pendingSale.name}
                    {isInjuryFlagged(pendingSale.name) && <span style={{ color: "#ff8c42" }}> 🩹 injury risk</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.dim }}>
                    <span style={{ color: POS_COLORS[pendingSale.pos], fontWeight: 700 }}>{pendingSale.pos}</span>
                    {" "}· {pendingSale.team} · #{pendingSale.rank}{pendingSale.bye ? ` · Bye ${pendingSale.bye}` : ""}
                  </div>
                </div>
                <button onClick={cancelSale} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 20 }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Field label="Winning team #" C={C} small>
                  <input type="number" min={1} max={teamCount} value={saleTeam}
                    onChange={(e) => setSaleTeam(Math.max(1, Math.min(teamCount, +e.target.value || 1)))}
                    style={{ ...numInput(C), width: 70 }} />
                </Field>
                <Field label="Price ($)" C={C} small>
                  <input type="number" min={0} value={salePrice} autoFocus
                    onChange={(e) => setSalePrice(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") logSale(); }}
                    style={{ ...numInput(C), width: 80 }} />
                </Field>
                {saleTeam === myPick && (
                  <div style={{ fontSize: 12, color: C.dim, paddingBottom: 9 }}>
                    Your max bid: <strong style={{ color: C.gold }}>${maxBid}</strong>
                  </div>
                )}
                <button onClick={logSale} disabled={salePrice === ""}
                  style={{ ...btn(C.accent, C.bg), opacity: salePrice === "" ? 0.4 : 1, marginLeft: "auto" }}>
                  Log Sale ✓
                </button>
              </div>
            </div>
          )}

          {/* Live draft intelligence — runs & tier cliffs */}
          {picks.length < totalPicks && (positionalRun || tierCliffs.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {positionalRun && (
                <div style={{ background: "rgba(230,57,70,0.12)", border: `1px solid ${POS_COLORS[positionalRun.pos]}`,
                  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.txt, animation: "fadeIn .25s ease",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                  🏃 <strong style={{ color: POS_COLORS[positionalRun.pos] }}>{positionalRun.pos} run</strong> —
                  {" "}{positionalRun.count} of the last {positionalRun.window} picks.
                  {positionalRun.leftInTopTier > 0
                    ? ` Only ${positionalRun.leftInTopTier} left in the top ${positionalRun.pos} tier.`
                    : ` The top ${positionalRun.pos} tier is gone.`}
                </div>
              )}
              {tierCliffs.map((c) => (
                <div key={c.pos} style={{ background: "rgba(255,210,63,0.10)", border: `1px solid ${C.gold}`,
                  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.txt, animation: "fadeIn .25s ease",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                  ⛰ <strong style={{ color: C.gold }}>{c.pos} tier cliff</strong> —
                  {" "}{c.left === 1 ? "last elite" : `only ${c.left}`} {c.pos} before a big drop
                  {" "}({c.names.join(", ")}). Grab now or wait a full tier.
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendation && picks.length < totalPicks && (
            <div className="diq-card" style={{ background: "linear-gradient(180deg, #171d14 0%, #121823 60%)",
              border: `1px solid ${C.gold}`, borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <div style={{ fontFamily: headFont, fontSize: 18, letterSpacing: 1, color: C.gold, marginBottom: 10 }}>
                ⚡ BEST AVAILABLE {isMyTurn ? "FOR YOU" : ""}
                <span style={{ fontFamily: font, fontSize: 11, letterSpacing: 0, color: C.dim, fontWeight: 400 }}>
                  {" "}· {FORMAT_LABEL[scoringFormat]} weighted
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {recommendation.map((p) => {
                  const slip = currentOverall - p.rank;
                  return (
                    <button key={p.id} onClick={() => pickOrNominate(p)} className="diq-hover-card" style={{
                      flex: "1 1 150px", textAlign: "left", background: C.bg, border: `1px solid ${C.line}`,
                      borderLeft: `3px solid ${POS_COLORS[p.pos]}`, borderRadius: 8, padding: "10px 12px", color: C.txt,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: C.dim }}>
                        {p.pos} · {p.team} · #{p.rank}
                        {slip >= 8 && <span style={{ color: C.accent, fontWeight: 700 }}> · 💎 value</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {valuePicks.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.dim }}>
                  💎 <strong style={{ color: C.accent }}>Falling past ADP:</strong>{" "}
                  {valuePicks.map((p, i) => (
                    <span key={p.id}>
                      <span onClick={() => pickOrNominate(p)} style={{ color: C.txt, cursor: "pointer", textDecoration: "underline dotted" }}>
                        {p.name}
                      </span> ({p.pos}, #{p.rank}, {p.slip} past){i < valuePicks.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search + filter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players…"
              style={{ flex: "1 1 200px", background: C.panel, color: C.txt, border: `1px solid ${C.line}`,
                borderRadius: 8, padding: "10px 12px", fontSize: 14 }} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {["ALL", ...POSITIONS].map((pos) => (
              <button key={pos} onClick={() => setPosFilter(pos)} style={{
                background: posFilter === pos ? (POS_COLORS[pos] || C.accent) : "transparent",
                color: posFilter === pos ? C.bg : C.dim, border: `1px solid ${posFilter === pos ? "transparent" : C.line}`,
                borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700,
                boxShadow: posFilter === pos ? "0 2px 8px rgba(0,0,0,0.3)" : "none" }}>
                {pos}{pos !== "ALL" && tiers[pos] ? ` ${tiers[pos].length}` : ""}
              </button>
            ))}
          </div>

          {/* Player list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.length === 0 && <p style={{ color: C.dim }}>No players match.</p>}
            {filtered.slice(0, 100).map((p) => (
              <div key={p.id} className="diq-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                background: C.panel, borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${POS_COLORS[p.pos]}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: C.dim, fontSize: 13, fontWeight: 700, width: 28 }}>#{p.rank}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.dim }}>
                      <span style={{ color: POS_COLORS[p.pos], fontWeight: 700 }}>{p.pos}</span> · {p.team}{p.bye ? ` · Bye ${p.bye}` : ""}
                      {currentOverall - p.rank >= 8 && <span style={{ color: C.accent, fontWeight: 700 }}> · 💎</span>}
                      {isInjuryFlagged(p.name) && <span style={{ color: "#ff8c42", fontWeight: 700 }}> · 🩹 injury risk</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => toggleInjuryFlag(p.name)}
                    title={isInjuryFlagged(p.name) ? "Unflag injury risk" : "Flag as injury risk"}
                    style={{ background: "transparent", border: "none", cursor: "pointer",
                      color: isInjuryFlagged(p.name) ? "#ff8c42" : C.dim, fontSize: 13, padding: 4 }}>
                    🩹
                  </button>
                  <button onClick={() => openNotesFor(p.name)} title="Research notes"
                    style={{ background: "transparent", border: "none", cursor: "pointer",
                      color: notesFor(p.name).length ? C.gold : C.dim, fontSize: 13, padding: 4 }}>
                    📝{notesFor(p.name).length > 0 ? notesFor(p.name).length : ""}
                  </button>
                  <button onClick={() => pickOrNominate(p)} disabled={picks.length >= totalPicks}
                    style={{ ...btn(isMyTurn ? C.accent : "transparent", isMyTurn ? C.bg : C.txt, C.line), padding: "6px 14px", fontSize: 13 }}>
                    {draftMode === "AUCTION" ? "Log" : "Draft"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: my roster + board */}
        <div style={{ padding: 20, position: "sticky", top: 0 }}>
          {/* Auction: budget summary + every team's remaining $ at a glance */}
          {draftMode === "AUCTION" && (
            <div className="diq-card" style={{ background: "linear-gradient(180deg, #141b28 0%, #10161f 100%)",
              border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.dim }}>Your budget</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: myBudgetRemaining > 0 ? C.accent : C.accentRed }}>
                  ${myBudgetRemaining}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>
                of ${budget} · {mySlotsRemaining} slot{mySlotsRemaining === 1 ? "" : "s"} left · max bid <strong style={{ color: C.gold }}>${maxBid}</strong>
              </div>
              <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>ALL TEAM BUDGETS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
                  {Array.from({ length: teamCount }, (_, i) => i + 1).map((t) => (
                    <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                      color: t === myPick ? C.txt : C.dim, fontWeight: t === myPick ? 700 : 400 }}>
                      <span>{t === myPick ? "★ " : ""}Team {t}</span>
                      <span>${teamBudgetRemaining(t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ fontFamily: headFont, fontSize: 20, letterSpacing: 1, color: C.accent, marginBottom: 10 }}>
            YOUR ROSTER (TEAM {myPick})
          </div>
          {positionNeeds.length > 0 && (
            <div style={{ marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.dim }}>Needs:</span>
              {positionNeeds.map((n) => (
                <span key={n.pos} style={{ fontSize: 11, fontWeight: 700, background: POS_COLORS[n.pos],
                  color: C.bg, borderRadius: 5, padding: "3px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{n.pos} ×{n.need}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 24 }}>
            {myRoster.length === 0 && <p style={{ color: C.dim, fontSize: 13 }}>No picks yet.</p>}
            {myRoster.map((p, i) => {
              const clash = p.player.bye && byeCounts[p.player.bye] > 1;
              return (
                <div key={i} className="diq-row" style={{ background: C.panel, borderRadius: 6, padding: "7px 10px", fontSize: 13,
                  borderLeft: `3px solid ${POS_COLORS[p.player.pos]}` }}>
                  <span style={{ color: POS_COLORS[p.player.pos], fontWeight: 700 }}>{p.player.pos}</span> {p.player.name}
                  <span style={{ color: C.dim }}> · {p.player.team}</span>
                  {p.price != null && <span style={{ color: C.gold, fontWeight: 700 }}> · ${p.price}</span>}
                  {p.player.bye && (
                    <span style={{ color: clash ? C.accentRed : C.dim, fontWeight: clash ? 700 : 400 }}>
                      {" · "}Bye {p.player.bye}{clash ? " ⚠" : ""}
                    </span>
                  )}
                  {isInjuryFlagged(p.player.name) && <span style={{ color: "#ff8c42" }}> · 🩹</span>}
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: headFont, fontSize: 20, letterSpacing: 1, color: C.txt, marginBottom: 10 }}>
            RECENT PICKS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 300, overflowY: "auto" }}>
            {[...picks].reverse().slice(0, 15).map((p, i) => {
              const overall = picks.length - i;
              return (
                <div key={i} className="diq-row" style={{ fontSize: 12, color: C.dim, display: "flex", justifyContent: "space-between",
                  padding: "5px 8px", background: p.team === myPick ? "rgba(57,255,136,0.08)" : "transparent", borderRadius: 5 }}>
                  <span><span style={{ color: C.dim }}>{overall}.</span> <span style={{ color: C.txt }}>{p.player.name}</span>
                    {p.price != null && <span style={{ color: C.gold }}> ${p.price}</span>}</span>
                  <span style={{ color: POS_COLORS[p.player.pos], fontWeight: 700 }}>T{p.team}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    {researchButton}
    {researchPanel}
    {injurySuggestPanel}
    {playerNameOptions}
    </>
  );
}

function Label({ children, C, style }) {
  return <div style={{ fontFamily: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif", fontSize: 18, letterSpacing: 1, color: C.txt, marginBottom: 8, ...style }}>{children}</div>;
}
function HelpStep({ n, title, children, C }) {
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: C.accent,
        color: C.bg, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
      <div>
        <div style={{ color: C.txt, fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children, C, small }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: small ? 11 : 13, color: C.dim, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}
// Small segmented-control pill group — used for draft type / scoring format.
function SegGroup({ options, value, onChange, C }) {
  return (
    <div style={{ display: "inline-flex", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 3, gap: 3 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          background: value === o.value ? C.accent : "transparent",
          color: value === o.value ? C.bg : C.dim,
          border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: value === o.value ? "0 2px 8px rgba(57,255,136,0.25)" : "none" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
// Solid accent-colored buttons get a soft matching glow automatically —
// keeps every primary CTA in the app visually consistent without repeating
// the shadow value at each call site.
const BTN_GLOW = { "#39ff88": "rgba(57,255,136,0.28)", "#ffd23f": "rgba(255,210,63,0.28)" };
const btn = (bg, color, border) => ({
  background: bg, color, border: `1px solid ${border || bg}`, borderRadius: 10,
  padding: "9px 16px", fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
  boxShadow: BTN_GLOW[bg] ? `0 4px 14px ${BTN_GLOW[bg]}` : "none",
});
const numInput = (C) => ({
  background: C.bg, color: C.txt, border: `1px solid ${C.line}`, borderRadius: 8,
  padding: "8px 10px", width: 70, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
});
