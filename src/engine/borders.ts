import type { BorderKind, StatusKind } from "./model";

export type BorderSet = {
  tl: string; tr: string; bl: string; br: string;
  h: string; v: string; tj: string; bj: string; lj: string; rj: string; x: string;
};

export const BORDERS: Record<BorderKind, BorderSet> = {
  single:  { tl:"┌", tr:"┐", bl:"└", br:"┘", h:"─", v:"│", tj:"┬", bj:"┴", lj:"├", rj:"┤", x:"┼" },
  rounded: { tl:"╭", tr:"╮", bl:"╰", br:"╯", h:"─", v:"│", tj:"┬", bj:"┴", lj:"├", rj:"┤", x:"┼" },
  double:  { tl:"╔", tr:"╗", bl:"╚", br:"╝", h:"═", v:"║", tj:"╦", bj:"╩", lj:"╠", rj:"╣", x:"╬" },
  heavy:   { tl:"┏", tr:"┓", bl:"┗", br:"┛", h:"━", v:"┃", tj:"┳", bj:"┻", lj:"┣", rj:"┫", x:"╋" },
  ascii:   { tl:"+", tr:"+", bl:"+", br:"+", h:"-", v:"|", tj:"+", bj:"+", lj:"+", rj:"+", x:"+" },
};

export type StatusEntry = { sym: string; color: string };

export const STATUS: Record<StatusKind, StatusEntry> = {
  ok:     { sym:"●", color:"green"  },
  warn:   { sym:"▲", color:"yellow" },
  error:  { sym:"✖", color:"red"    },
  info:   { sym:"•", color:"blue"   },
  idle:   { sym:"○", color:"dim"    },
  active: { sym:"◆", color:"accent" },
};

const ASCII_FONT: Record<string, string[]> = {
  "A":[" ## ","#  #","####","#  #","#  #"],
  "B":["### ","#  #","### ","#  #","### "],
  "C":[" ###","#   ","#   ","#   "," ###"],
  "D":["### ","#  #","#  #","#  #","### "],
  "E":["####","#   ","### ","#   ","####"],
  "F":["####","#   ","### ","#   ","#   "],
  "G":[" ###","#   ","# ##","#  #"," ###"],
  "H":["#  #","#  #","####","#  #","#  #"],
  "I":["###"," # "," # "," # ","###"],
  "J":["  ##","   #","   #","#  #"," ## "],
  "K":["#  #","# # ","##  ","# # ","#  #"],
  "L":["#   ","#   ","#   ","#   ","####"],
  "M":["#   #","## ##","# # #","#   #","#   #"],
  "N":["#  #","## #","# ##","#  #","#  #"],
  "O":[" ## ","#  #","#  #","#  #"," ## "],
  "P":["### ","#  #","### ","#   ","#   "],
  "Q":[" ## ","#  #","#  #"," ## ","   #"],
  "R":["### ","#  #","### ","# # ","#  #"],
  "S":[" ###","#   "," ## ","   #","### "],
  "T":["###"," # "," # "," # "," # "],
  "U":["#  #","#  #","#  #","#  #"," ## "],
  "V":["#   #","#   #"," # # "," # # ","  #  "],
  "W":["#   #","#   #","# # #","## ##","#   #"],
  "X":["#   #"," # # ","  #  "," # # ","#   #"],
  "Y":["#   #"," # # ","  #  ","  #  ","  #  "],
  "Z":["####","   #"," ## ","#   ","####"],
  "0":[" ## ","#  #","#  #","#  #"," ## "],
  "1":["  # "," ## ","  # ","  # "," ###"],
  "2":["### ","   #"," ## ","#   ","####"],
  "3":["### ","   #"," ## ","   #","### "],
  "4":["#  #","#  #","####","   #","   #"],
  "5":["####","#   ","### ","   #","### "],
  "6":[" ###","#   ","### ","#  #"," ## "],
  "7":["####","   #","  # "," #  "," #  "],
  "8":[" ## ","#  #"," ## ","#  #"," ## "],
  "9":[" ## ","#  #"," ###","   #","### "],
  " ":["  ","  ","  ","  ","  "],
  ".":[" "," "," "," ","#"],
  ",":[" "," "," ","#","#"],
  "!":["#","#","#"," ","#"],
  "?":["### ","   #"," ## ","    "," #  "],
  "-":["    ","    ","####","    ","    "],
  "+":["   "," # ","###"," # ","   "],
  "=":["    ","####","    ","####","    "],
  ":":[" ","#"," ","#"," "],
  "*":["   ","# #"," # ","# #","   "],
  "/":["   #","  # "," #  ","#   ","#   "],
  "_":["    ","    ","    ","    ","####"],
  "(":[" #","# ","# ","# "," #"],
  ")":["# "," #"," #"," #","# "],
  "<":["  #"," # ","#  "," # ","  #"],
  ">":["#  "," # ","  #"," # ","#  "],
  "@":[" ## ","#  #","# ##","#   "," ## "],
  "#":[" # # ","#####"," # # ","#####"," # # "],
  "'"  :["#","#"," "," "," "],
};

const ASCII_H = 5;

export function asciiLines(text: string, fill?: string, gap?: number): string[] {
  text = (text != null ? String(text) : "").toUpperCase();
  const g = gap == null ? 1 : gap;
  const rows = ["", "", "", "", ""];
  for (const ch of text) {
    const glyph = ASCII_FONT[ch] || ASCII_FONT["?"];
    let w = 0;
    for (let r = 0; r < ASCII_H; r++) w = Math.max(w, (glyph[r] || "").length);
    for (let r = 0; r < ASCII_H; r++) rows[r] += (glyph[r] || "").padEnd(w, " ") + " ".repeat(g);
  }
  return rows.map((r) => r.replace(/#/g, fill || "#"));
}

export function renderAsciiText(text: string, opts?: { fillChar?: string; letterSpacing?: number }): string {
  const o = opts || {};
  return asciiLines(text, o.fillChar || "█", o.letterSpacing)
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n");
}
