// Best-effort removal of personal identifiers from free-typed questions.
// Runs in the browser before a question is sent, and again on the server for
// direct API calls. The health content stays; identifiers are replaced with
// placeholders. Pattern matching can't catch every name, so the UI also frames
// questions as being asked "as Jane".

const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

// The demo persona's name is not personal information.
const ALLOWED_NAMES = new Set(["jane", "helix"]);

type Rule = { label: string; pattern: RegExp };

const RULES: Rule[] = [
  { label: "email", pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { label: "link", pattern: /\bhttps?:\/\/\S+|\bwww\.\S+/gi },
  { label: "ID number", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    label: "phone number",
    pattern: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g,
  },
  // Numeric dates with a year: 03/14/1990, 3-14-90, 1990-03-14
  {
    label: "date",
    pattern: /\b(?:\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})|\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g,
  },
  // Written dates with a year: March 14, 1990 / 14 March 1990
  {
    label: "date",
    pattern: new RegExp(
      `\\b(?:${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+\\d{4})\\b`,
      "gi"
    ),
  },
  {
    label: "address",
    pattern:
      /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place)\b/g,
  },
  // Long digit runs: member, policy, account or record numbers
  { label: "ID number", pattern: /\b\d{7,}\b/g },
];

// "my name is Sarah Lee", "I'm Sarah", "this is Sarah", "call me Sarah"
// The intro is case-insensitive by hand; the name itself must be capitalized.
const NAME_INTRO =
  /\b((?:[Mm]y )?[Nn]ame(?:'s|’s| is)|[Ii] am|[Ii]['’]?m|[Tt]his is|[Cc]all me)\s+([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,2})/g;

export type Redaction = { text: string; removed: string[] };

export function redactIdentifiers(input: string): Redaction {
  const removed = new Set<string>();
  let text = input;

  for (const { label, pattern } of RULES) {
    text = text.replace(pattern, () => {
      removed.add(label);
      return `[${label} removed]`;
    });
  }

  text = text.replace(NAME_INTRO, (match, intro: string, name: string) => {
    if (ALLOWED_NAMES.has(name.split(/\s+/)[0].toLowerCase())) return match;
    removed.add("name");
    return `${intro} [name removed]`;
  });

  return { text, removed: [...removed] };
}
