
import * as fs from 'fs';
import * as path from 'path';
import * as parser from 'xml2json';


const fileArg = path.resolve(process.argv[2] || './input.xml');
const input: Buffer = readInput(fileArg);
const json: GrabberJSON = parseInput(input);
const transformed: MatroskaJSON = transformJSON(json);
const matroskaXml: string = buildXML(transformed);
writeOutput({ fileArg, matroskaXml });
console.log(`Done.`);

// ---------------------------

function readInput(fileArg: string): Buffer {
  console.log(`Reading "${fileArg}"...`);
  return fs.readFileSync(fileArg);
}

function parseInput(input: Buffer): GrabberJSON {
  console.log(`Parsing...`);
  return JSON.parse(parser.toJson(input, { reversible: true })) as GrabberJSON;
}

function transformJSON(json: GrabberJSON): MatroskaJSON {
  console.log(`Transforming...`);
  validateFormat(json);
  return transformInput(json);
}

function buildXML(transformed: MatroskaJSON): string {
  console.log(`Building XML...`);
  const xml = parser.toXml(JSON.parse(JSON.stringify(transformed)));
  return `<?xml version="1.0"?>\n<!-- <!DOCTYPE Chapters SYSTEM "matroskachapters.dtd"> -->\n${xml}`;
}

function writeOutput(opt: { fileArg: string, matroskaXml: string }): void {
  const fileOut = fileArg.replace(/\.xml$/, '-matroska.xml');
  console.log(`Writing "${fileOut}"...`);
  fs.writeFileSync(fileOut, matroskaXml);
}

// ---------------------------

class InvalidInputError extends Error {};

function validateFormat(input: GrabberJSON): void {
  if (!input.chapterInfo) {
    throw new InvalidInputError('ChapterInfo is missing, not grabber style input?');
  }
  if (!input.chapterInfo.chapters 
      || !input.chapterInfo.chapters 
      || !input.chapterInfo.chapters.chapter 
      || !input.chapterInfo.chapters.chapter.length) {
    throw new InvalidInputError('No chapters found in input source');
  }
}

function transformInput(input: GrabberJSON): MatroskaJSON {
  return {
    Chapters: transformChapters(input),
  };
}

function transformChapters(input: GrabberJSON): MatroskaChapters {
  return {
    EditionEntry: {
      EditionUID: {
        $t: random18(),
      },
      ChapterAtom: transformChapterAtom(input),
    },
  };
}

function transformChapterAtom(input: GrabberJSON): MatroskaChapterAtom[] {
  return input.chapterInfo.chapters.chapter.map( (chapter: GrabberChapter, i: number): MatroskaChapterAtom => {
    const display: MatroskaChapterDisplay = transformChapterDisplay(chapter, i);
    return {
      ChapterTimeStart: tValue(chapter.time),
      ChapterUID: tValue(random18()),
      ChapterDisplay: display,
    }
  });
}

function transformChapterDisplay(chapter: GrabberChapter, index: number): MatroskaChapterDisplay {
  return {
    ChapterString: tValue(chapter.name || `Chapter ${index + 1}`),
    ChapterLanguage: tValue('eng'),
  };
}

function random18(): string {
  return Math.random().toString().substring(2, 11) + Math.random().toString().substring(2, 11);
}

function tValue(t: string): TextValue {
  return { $t: t };
}

type Attr = string;
type NumberAttr = Attr;
type DurationAttr = Attr;

interface TextValue { 
  $t: string;
}
type DateValue = TextValue;
type NumberValue = TextValue;
type DurationValue = TextValue;

interface MatroskaChapterDisplay {
  ChapterString: TextValue;
  ChapterLanguage: TextValue;
}

interface MatroskaChapterAtom {
  ChapterTimeStart: DurationValue;
  ChapterTimeEnd?: DurationValue;
  ChapterUID: TextValue;
  ChapterDisplay: MatroskaChapterDisplay;
}

interface MatroskaEditionEntry {
  EditionUID: TextValue;
  ChapterAtom: MatroskaChapterAtom[];
}

interface MatroskaChapters {
  EditionEntry: MatroskaEditionEntry;
}

interface MatroskaJSON {
  Chapters: MatroskaChapters;
}


interface GrabberChapter {
  time: DurationAttr;
  name?: Attr;
}

interface GrabberChapters {
  chapter: GrabberChapter[];
}

interface GrabberSource {
  type: TextValue;
  hash: TextValue;
  fps?: NumberValue;
  duration: DurationValue;
}

interface GrabberRef {
  chapterSetId: TextValue;
}

interface GrabberChapterInfo {
  "xml:lang": Attr;
  version: Attr;
  extractor: Attr;
  client: Attr;
  confirmations: NumberAttr;
  xmlns: Attr;
  title: TextValue;
  ref: GrabberRef;
  source: GrabberSource;
  chapters: GrabberChapters;
  createdDate: DateValue;
  updatedDate: DateValue;
}

interface GrabberJSON {
  chapterInfo: GrabberChapterInfo;
}
