const TYPE_URI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const NAME_URI = 'http://schema.org/name';

const defaultBase = 'http://example.org/'
const indentStep = 30;

/**
 * @param {string} text
 * @return {string}
 */
function replacePrefix(text) {
    text = text.split(/https?:\/\/schema.org\//g).join('');
    text = text.split(/http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#/g).join( '@');
    text = text.split(/http:\/\/www.w3.org\/2000\/01\/rdf-schema#/g).join( '@');
    return text;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

/**
 * @param {Map<string, *>} shapes
 * @return {number[]}
 */
function makeColorSet(shapes) {
    let totalEntitiesCount = 0;
    const colors = [];
    for (const store of shapes.values()) {
        totalEntitiesCount += new Set(store.getSubjects().map(x => x.id)).size;
    }
    for (let i = 0; i < totalEntitiesCount; i++)
        colors.push(i/totalEntitiesCount*360);
    shuffleArray(colors);
    return colors;
}

/**
 * Makes an html layout for a single triple
 * @param {string} predicate
 * @param {string} object
 * @param {{
 *     indentLevel: number,
 *     entityColorId: number,
 *     isTarget: boolean
 * }} options
 * @return {*}
 */
function dataItemLayout(predicate, object, options) {
    const indentBlock = document.createElement('div');
    indentBlock.style.width = `${options.indentLevel * indentStep}px`;
    indentBlock.style.borderRight = `3px solid hsl(${options.entityColorId}, 60%, 70%)`;
    indentBlock.style.marginRight = '3px';

    const predicateEl = document.createElement('div');
    predicateEl.classList.add('predicate');
    const predicateTextEl = document.createElement('div');
    predicateTextEl.innerText = replacePrefix(predicate);
    predicateEl.appendChild(indentBlock);
    predicateEl.appendChild(predicateTextEl);

    const objectEl = document.createElement('div');
    objectEl.classList.add('object');
    objectEl.innerText = object;

    const tripleRow = document.createElement('div');
    tripleRow.classList.add('triple-row');
    tripleRow.style.background = options.isTarget ? '#f4f4f4' : '#fff';
    tripleRow.appendChild(predicateEl);
    tripleRow.appendChild(objectEl);

    return tripleRow;
}

/**
 * Recursive level-based html generation
 * @param store - n3 store with quads
 * @param {string} id - current node identifier
 * @param {string[]} displayed
 * @param {number} indentLevel - current indentation level
 * @param {{
 *  target?:{type: 'entity'|'property', uri: string}
 *  colorSet?: number[]
 *  }|undefined} options
 * @return {HTMLElement[]}
 */
function markupLevel(store, id, displayed, indentLevel, options = undefined) {
    if (displayed.includes(id)) return []
    displayed.push(id);

    let levelQuads = store.getQuads(id, undefined, undefined);
    if (levelQuads.length === 0) return [];
    const tripleRows = [];

    // options for dataItemLayout building
    const layoutOptions = {
        indentLevel: indentLevel,
        entityColorId: options && options.colorSet? options.colorSet.pop() : Math.random() * 360,
        isTarget: false,
    }

    // important properties (type & name) go first
    const typeQuad = store.getQuads(id, TYPE_URI, undefined);
    const nameQuad = store.getQuads(id, NAME_URI, undefined);
    levelQuads = levelQuads.filter(x => x.predicate.value !== TYPE_URI && x.predicate.value !== NAME_URI);
    levelQuads.push(...nameQuad);
    levelQuads.push(...typeQuad);
    levelQuads.reverse();

    // adding @id (it's not in quads)
    if (levelQuads.length > 0 && levelQuads[0].subject.termType === 'NamedNode') {
        tripleRows.push(dataItemLayout('@id', id, layoutOptions));
    }

    for (const quad of levelQuads) {
        // used for highlighting target triples
        layoutOptions.isTarget = options && options.target && (options.target.type === 'entity' &&
            typeQuad.length > 0 && typeQuad[0].object.value === options.target.uri ||
            options.target.type === 'property' && quad.predicate.value === options.target.uri);
        const next_level = markupLevel(store, quad.object.id, displayed, indentLevel + 1, options);
        if (next_level.length > 0){
            tripleRows.push(dataItemLayout(quad.predicate.value, '', layoutOptions));
            tripleRows.push(...next_level);
        } else {
            const object = quad.object.termType === 'NamedNode' ? replacePrefix(quad.object.value) :
                quad.object.value;
            tripleRows.push(dataItemLayout(quad.predicate.value, object, layoutOptions));
        }
    }
    return tripleRows;
}

/**
 * Get as close as possible base url that is still valid
 * @param {string} data - input markup
 * @return {string}
 */
function makeBaseUrl(data) {
    let dataObj;
    try {
        dataObj = JSON.parse(data);
    } catch (e) {
        // return default if can't be parsed as JSON
        return defaultBase;
    }
    if (dataObj.hasOwnProperty('@id')) {
        // if has an @id and @id has a full url prefix (e.g. https://, etc.), return it
        // else this is a relative url and we need to add the default base to it
        if (dataObj['@id'].match(/.*?:\/\/.*/g))
            return dataObj['@id'];
        else
            return defaultBase + dataObj['@id'];
    }
    return defaultBase;
}

/**
 * Base function that will can be called for pretty markup generation
 * @param {string} data - json-ld markup
 * @param {{baseUrl?: string, target?: {type: 'entity'|'property', uri: string}}|undefined} options
 *  - used for highlighting target entities/properties, e.g. startDate in the Event entity
 * @return {Promise<HTMLElement[]>}
 */
async function prettyMarkupHtml(data, options = undefined) {
    try {
        JSON.parse(data);
    } catch (e) {
        let domParser = new DOMParser();
        let jsonld = [].slice.call(domParser.parseFromString(data, 'text/html')
            .getElementsByTagName('script'))
            .filter(x => x.type === 'application/ld+json');
        // if there is exactly one json-ld, then parse it, else throw an exception
        // (I assume that only one json-ld can be in the example, but if not we still can
        // parse and display more than one)
        if (jsonld.length === 1) data = jsonld[0].innerText;
        else if (jsonld.length > 1) throw 'not single json-ld in the example';
    }
    // passed baseUrl is prioritised, but if not given, a close to the markup baseUrl will be used
    const baseUrl = options && options.baseUrl ? options.baseUrl : makeBaseUrl(data);
    const target = options && options.target ? options.target : undefined;
    const shapes = schemarama.quadsToShapes(await schemarama.inputToQuads(data, baseUrl));
    const colorSet = makeColorSet(shapes);
    const tripleRows = [];
    for (const [id, shape] of shapes.entries()) {
        tripleRows.push(...markupLevel(shape, id, [], 0, {colorSet: colorSet, target: target}));
    }
    return tripleRows;
}

/**
 * Hypothetical function that can be called every time we need to display the pretty markup
 * @param {string} data - json-ld markup
 * @return {Promise<void>}
 */
async function prettyMarkup(data) {
    const prettyMarkupDiv = document.getElementById('pretty-markup');
    const elements = await prettyMarkupHtml(data);
    for (const el of elements) {
        prettyMarkupDiv.appendChild(el);
    }
}

const data = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "#author",
      "@type": "Person",
      "birthDate": "1892",
      "deathDate": "1973",
      "name": "Tolkien, J. R. R. (John Ronald Reuel)",
      "sameAs": "http://viaf.org/viaf/95218067"
    },
    {
      "@id": "#trilogy",
      "@type": "Book",
      "about": "http://id.worldcat.org/fast/1020337",
      "hasPart": [
        {
          "@id": "#book3",
          "@type": [
            "Book",
            "PublicationVolume"
          ],
          "name": "The Return of the King",
          "about": "http://id.worldcat.org/fast/1020337",
          "isPartOf": "#trilogy",
          "inLanguage": "en",
          "volumeNumber": "3",
          "author": "#author"
        },
        {
          "@id": "#book2",
          "@type": [
              "Book",
              "PublicationVolume"
          ],
          "name": "The Two Towers",
          "about": "http://id.worldcat.org/fast/1020337",
          "isPartOf": "#trilogy",
          "inLanguage": "en",
          "volumeNumber": "2",
          "author": "#author"
        },
        {
          "@id": "#book1",
          "@type": [
            "Book",
            "PublicationVolume"
          ],
          "name": "The Fellowship of the Ring",
          "about": "http://id.worldcat.org/fast/1020337",
          "isPartOf": "#trilogy",
          "inLanguage": "en",
          "volumeNumber": "1",
          "author": "#author"
        }
      ],
      "name": "Lord of the Rings",
      "inLanguage": "en",
      "genre": "fictional",
      "author": "#author"
    }
  ]
}
</script>
`;
prettyMarkup(data);

