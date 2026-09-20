# Keyword reference — task classification

How `transform.py` turns free-text agenda cells into `kind` + `student_name`,
and how `parser.py` protects instructor-name detection. All matching happens on
uppercase normalized text; **first matching rule wins**; cell colors are
ignored by the classifier.

## Full-cell keywords (entire cell matches → no student)

| kind | keywords |
|---|---|
| `ferie` | FERIE, FERIA, FEFERIE, 1/2 FERIA |
| `office` | UFFICIO, UFF, LAVORI UFF |
| `theory` | TEORIA (incl. typo TEIORIA) |
| `exam` | QUIZ, anything containing ESAM, REV* (REV QUIZ/GUIDA, REVI, REVISIONE), ESP DI GUIDA/CONTROLLO, ESPERIMENTO DI GUIDA |
| `lesson` | GUIDA, GUIDE (unnamed driving lesson) |
| `adr` | ADR, CORSO ADR |
| `dtt` | DTT, CML, CAM COMM, CAM DI COMM, CAMCOM |
| `meeting` | RIUNIONE, CONFERENZA, SOCIAL, FORMAZIONE, ADDESTRAMENTO, SICUREZZA, CORSO |
| `medical` | MEDICINA, MEDICA, VISITA, VISITE, OSPEDALE, PSICHIATRICA |
| `sick` | MALATA, MALATTIA (any MALAT*) |
| `group_lesson` | NAOMI (E SERENA), LEZ COLLETTIVA |
| `shadowing` | AFFIANCAMENTO, CON \<name\> |
| `autoservice` | AUTOSERVICE |
| `logistics` | PANDA, PRENDERE, PORTARE, RIPORTARE, RIP PANDA, RITIRARE, RITIRO, TAGLIANDO, MANUTENZ*, GOMMISTA, CARROZZERIA, MECCANICO, NOLEGGIO, TRASF*, AUTO, MOTO |

## Leading keywords (keyword + optional student name after)

| kind | prefixes |
|---|---|
| `exam` | ES, ESAME, ESAMI (ES GUIDA, ESGUIDA, ES QUIZ…), PRE-ESAMI / PRE ES / PRE SAME, REVISIONE |
| `points_recovery` | REC PUNTI, RECPUNTI, RECUPERO (PUNTI), RC PUNTI, REC |
| `cqc_renewal` | RINN (CQC), RIN CQC, RINNCQC, RINNOVO (CQC), REG CQC |
| `cqc_consult` | CONS CQC |
| `cqc` | CQC, LEZ CQC, CQC VIDEO |
| `logistics` | PASSAGGIO, PRENDERE, PORTARE, RIPORTARE, RITIRARE, RITIRO |

## Trailing annotations (keyword *after* the name)

- `NAME PRE ESAME` / `NAME PRE-ESAMI` → **exam** + NAME
- `NAME ESP GUIDA` / `ESPGUIDA` → **exam** + NAME
- `NAME CQC` / `NAME ADR` → **cqc** / **adr** + NAME
- `NAME (RINN CQC A2)` → note's kind + NAME
- `NAME NON È VENUTA…` → **note**, no student

## Junk list (bare cell → `note`, never a student)

NO, SI, OK, PROBABILMENTE, ANCORA, ASSENTE, TUTTI ASSENTI, NO MATTINA,
NO TEORIA, DA CONF, MOTO, AUTO, VIDEO, PANDA, LADY, P LADY, GUIDA, PUNTI,
RECUPERO, ISTRUTTORE, INSEGNANTE, MAPPA, SITO, BANCA, SOCIAL, TERME, ACQUI,
ACQUI TERME, ISOLA, FIERA, AULA 1/2/3, SPAZIO, SPAZIOGE, SPAZIO GENOVA,
INFOPOINT, VITA, VIA PIACENZA, GENOVA PARCHEGGI, MNO, CON??, CRONO, B CON,
DE LA ESE, CCIAA, CAPITANERIA, PROVINCIA, ASL, CONSORZIO, MILIZIA, MAGAZZINO,
PTAVANT, PEC, APT, MOD, CUM, SBRACI, SAN LORENZO

Plus junk patterns: pure numbers/time ranges, `N ORE`, weekday names
(LUNEDI…DOMENICA), 1–2 letter fragments, `SOLO`, `ONLINE`.

## Stripped from names (noise removal, not kinds)

- Leading times: `8,30 `, `10,00ES…`, `11-15 `
- Trailing license codes: A1, A2, A3, B1, B2, C1, CE, D1, BE, 1A, A, B, C, D
- Trailing tags: AUT, MAN, MECC, KB, TB, TC, AM, G.O, 0040, 0058,
  PERF(EZZIONAMENTO), REV
- Parentheses, phone numbers, trailing numbers/ranges
- Honorifics (parser): DOTT., DOTT.SA, DR, SSA + availability markers
  SI/NO/OK/DA CONF

## Instructor-name protection (`parser.py`)

A header cell is accepted as an instructor only if it looks like a person
(uppercase word pattern) AND is not a weekday label AND is not in
`NON_NAME_KEYWORDS`: TEORIA, CQC, ADR, DTT, UFFICIO, UFF, ESAMI, ESAMI A,
ES GUIDA, ES QUIZ, ES REV QUIZ, REC PUNTI, RINN CQC (variants), PRE-ESAMI,
MALATA, MALATTIA, FERIA, AUTOSERVICE, LEZ COLLETTIVA, CONS CQC,
AFFIANCAMENTO, RIUNIONE, MEDICINA, NAOMI E SERENA.

## App-side signals

- `student_id IS NOT NULL` ⟺ student-attached entry (keyword kinds are always
  null; `lesson` is null only for unnamed `GUIDA` cells)
- Feedback eligibility: `kind === 'lesson'` (+ `student_id != null` for the
  unnamed-GUIDA edge case)
